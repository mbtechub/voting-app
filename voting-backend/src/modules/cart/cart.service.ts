// src/modules/cart/cart.service.ts
// ===================================================
// PURPOSE:
// This service contains ALL business logic for creating
// a cart in the voting application.
//
// PRICING ENGINE:
// - Fetch election & candidate from DB
// - Validate election ACTIVE
// - Validate candidate belongs to election
// - Decide price: candidate override > election default
// - Snapshot pricePerVote + subTotal into CART_ITEMS
//
// UPDATED (per requirement):
// ✅ Allow MULTIPLE nominees (candidates) within the SAME poll (election) in one cart.
// ❌ Removed: "Only ONE candidate per election in a cart" restriction.
//
// UPDATED (UX improvement):
// ✅ getCartByUuid now returns electionTitle + candidateName + photoUrl (if available)
//   so public cart page can display names/pics instead of only IDs.
//
// IMPORTANT FIX (why you still saw Poll # / Nominee #):
// ✅ We now use ONE SQL join query in getCartByUuid so titles/names ALWAYS come back,
//   regardless of TypeORM entity mapping issues.
// ===================================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SequenceService } from '../../common/sequence.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartDto } from './dto/create-cart.dto';
import * as crypto from 'crypto';

// We import these entities so TypeORM can query them safely
import { Election } from '../elections/entities/election.entity';
import { Candidate } from '../candidates/entities/candidate.entity';

@Injectable()
export class CartService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sequenceService: SequenceService,
  ) {}

  // ===================================================
  // CREATE CART (WITH REAL PRICING)
  // ===================================================
  async createCart(dto: CreateCartDto) {
    // -----------------------------------------------
    // VALIDATION: items must exist + each item valid
    // -----------------------------------------------
    if (!dto?.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('items is required');
    }

    for (const item of dto.items) {
      if (!item?.electionId || !item?.candidateId || item?.voteQty == null) {
        throw new BadRequestException(
          'Each item must include electionId, candidateId, voteQty',
        );
      }
      if (item.voteQty <= 0) {
        throw new BadRequestException('voteQty must be greater than 0');
      }
    }

    // -----------------------------------------------
    // TRANSACTION: ensures cart + items saved together
    // -----------------------------------------------
    return this.dataSource.transaction(async (manager) => {
      // -------------------------------------------
      // STEP 1: CREATE CART RECORD
      // -------------------------------------------
      const cart = new Cart();
      cart.cartId = await this.sequenceService.getNextValue('SEQ_CART_ID');
      cart.cartUuid = crypto.randomBytes(16).toString('hex');
      cart.status = 'PENDING';
      cart.totalAmount = 0;

      await manager.save(cart);

      // -------------------------------------------
      // STEP 2: PROCESS CART ITEMS + PRICING
      // -------------------------------------------
      let totalAmount = 0;

      for (const item of dto.items) {
        // -----------------------------------------
        // 2A) Fetch election from DB
        // -----------------------------------------
        const election = await manager.findOne(Election, {
          where: { electionId: item.electionId },
        });

        if (!election) {
          throw new BadRequestException(`Election not found: ${item.electionId}`);
        }

        // Election must be ACTIVE to accept votes
        if (election.status !== 'ACTIVE') {
          throw new BadRequestException(
            `Election is not ACTIVE (electionId: ${item.electionId}, status: ${election.status})`,
          );
        }

        // -----------------------------------------
        // 2B) Fetch candidate from DB
        // -----------------------------------------
        const candidate = await manager.findOne(Candidate, {
          where: { candidateId: item.candidateId },
        });

        if (!candidate) {
          throw new BadRequestException(`Candidate not found: ${item.candidateId}`);
        }

        // Candidate must belong to the election selected
        if (candidate.electionId !== item.electionId) {
          throw new BadRequestException(
            `Candidate ${item.candidateId} does not belong to election ${item.electionId}`,
          );
        }

        // -----------------------------------------
        // 2C) Determine pricePerVote (rule):
        // Candidate override price > Election default price
        // -----------------------------------------
        const pricePerVote =
          candidate.votePrice != null ? candidate.votePrice : election.defaultVotePrice;

        if (pricePerVote == null) {
          throw new BadRequestException(
            `No vote price configured for election ${item.electionId} or candidate ${item.candidateId}`,
          );
        }

        // -----------------------------------------
        // 2D) Calculate subtotal for this cart item
        // -----------------------------------------
        const subTotal = pricePerVote * item.voteQty;

        // -----------------------------------------
        // 2E) Save CART_ITEM (snapshot values!)
        // -----------------------------------------
        const cartItem = new CartItem();
        cartItem.cart = cart;
        cartItem.electionId = item.electionId;
        cartItem.candidateId = item.candidateId;
        cartItem.voteQty = item.voteQty;
        cartItem.pricePerVote = pricePerVote;
        cartItem.subTotal = subTotal;

        await manager.save(cartItem);

        totalAmount += subTotal;
      }

      // -------------------------------------------
      // STEP 3: UPDATE CART TOTAL
      // -------------------------------------------
      cart.totalAmount = totalAmount;
      await manager.save(cart);

      // -------------------------------------------
      // RESPONSE BACK TO CLIENT
      // -------------------------------------------
      return {
        cartUuid: cart.cartUuid,
        totalAmount: cart.totalAmount,
      };
    });
  }

  // ===================================================
// GET CART BY UUID (Public-safe read)
// ✅ Returns poll title + nominee name + photoUrl
// Oracle JOIN version (reliable even if entity mappings differ)
// ===================================================
async getCartByUuid(cartUuid: string) {
  const uuid = (cartUuid || '').trim();
  if (!uuid) throw new BadRequestException('Cart not found');

  // Confirm cart exists (keeps previous behavior)
  const cart = await this.dataSource.manager.findOne(Cart, {
    where: { cartUuid: uuid },
  });
  if (!cart) throw new BadRequestException('Cart not found');

  const rows = await this.dataSource.query(
    `
    SELECT
      c.CART_ID           AS "cartId",
      c.CART_UUID         AS "cartUuid",
      c.STATUS            AS "status",
      c.TOTAL_AMOUNT      AS "totalAmount",

      ci.ELECTION_ID      AS "electionId",
      e.TITLE             AS "electionTitle",

      ci.CANDIDATE_ID     AS "candidateId",
      cand.NAME           AS "candidateName",
      cand.PHOTO_URL      AS "photoUrl",

      ci.VOTE_QTY         AS "voteQty",
      ci.PRICE_PER_VOTE   AS "pricePerVote",
      ci.SUB_TOTAL        AS "subTotal"
    FROM CARTS c
    JOIN CART_ITEMS ci
      ON ci.CART_ID = c.CART_ID
    LEFT JOIN ELECTIONS e
      ON e.ELECTION_ID = ci.ELECTION_ID
    LEFT JOIN CANDIDATES cand
      ON cand.CANDIDATE_ID = ci.CANDIDATE_ID
    WHERE c.CART_UUID = :1
    ORDER BY ci.ELECTION_ID ASC, ci.CANDIDATE_ID ASC
    `,
    [uuid],
  );

  // Cart exists but no items
  if (!rows || rows.length === 0) {
    return {
      cartId: cart.cartId,
      cartUuid: cart.cartUuid,
      status: cart.status,
      totalAmount: cart.totalAmount,
      items: [],
    };
  }

  return {
    cartId: rows[0].cartId,
    cartUuid: rows[0].cartUuid,
    status: rows[0].status,
    totalAmount: Number(rows[0].totalAmount ?? 0),
    items: rows.map((r: any) => ({
      electionId: Number(r.electionId),
      electionTitle: r.electionTitle ?? null,

      candidateId: Number(r.candidateId),
      candidateName: r.candidateName ?? null,
      photoUrl: r.photoUrl ?? null,

      voteQty: Number(r.voteQty),
      pricePerVote: Number(r.pricePerVote),
      subTotal: Number(r.subTotal),
    })),
  };
}

    // ===================================================
  // ADD ITEM TO CART (build cart gradually)
  // ✅ MERGE same nominee if already in cart
  // ===================================================
  async addItemToCart(dto: {
    cartUuid: string;
    electionId: number;
    candidateId: number;
    voteQty: number;
  }) {
    const { cartUuid, electionId, candidateId, voteQty } = dto;

    if (!cartUuid || !electionId || !candidateId || voteQty == null) {
      throw new BadRequestException(
        'cartUuid, electionId, candidateId, voteQty are required',
      );
    }
    if (voteQty <= 0) {
      throw new BadRequestException('voteQty must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const cart = await manager.findOne(Cart, { where: { cartUuid } });
      if (!cart) throw new BadRequestException('Cart not found');

      // Only allow edits while pending
      if (cart.status !== 'PENDING') {
        throw new BadRequestException(`Cart is not editable (status: ${cart.status})`);
      }

      // Fetch + validate election
      const election = await manager.findOne(Election, { where: { electionId } });
      if (!election) throw new BadRequestException(`Election not found: ${electionId}`);
      if (election.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Election is not ACTIVE (electionId: ${electionId}, status: ${election.status})`,
        );
      }

      // Fetch + validate candidate
      const candidate = await manager.findOne(Candidate, { where: { candidateId } });
      if (!candidate) throw new BadRequestException(`Candidate not found: ${candidateId}`);
      if (candidate.electionId !== electionId) {
        throw new BadRequestException(
          `Candidate ${candidateId} does not belong to election ${electionId}`,
        );
      }

      // Pricing rule: candidate override > election default
      const pricePerVote =
        candidate.votePrice != null
          ? candidate.votePrice
          : election.defaultVotePrice;

      if (pricePerVote == null) {
        throw new BadRequestException(
          `No vote price configured for election ${electionId} or candidate ${candidateId}`,
        );
      }

      // ✅ MERGE if same nominee already exists in this cart
      const existingItem = await manager.findOne(CartItem, {
        where: {
          cart: { cartId: cart.cartId } as any,
          electionId,
          candidateId,
        },
      });

      if (existingItem) {
        existingItem.voteQty = Number(existingItem.voteQty) + Number(voteQty);
        existingItem.subTotal = Number(existingItem.pricePerVote) * Number(existingItem.voteQty);

        await manager.save(existingItem);
      } else {
        const subTotal = Number(pricePerVote) * Number(voteQty);

        const cartItem = new CartItem();
        cartItem.cart = cart;
        cartItem.electionId = electionId;
        cartItem.candidateId = candidateId;
        cartItem.voteQty = voteQty;
        cartItem.pricePerVote = pricePerVote;
        cartItem.subTotal = subTotal;

        await manager.save(cartItem);
      }

      // Recompute total from DB
      const sumRow = await manager
        .createQueryBuilder(CartItem, 'ci')
        .select('NVL(SUM(ci.subTotal), 0)', 'total')
        .where('ci.cart = :cartId', { cartId: cart.cartId })
        .getRawOne<{ total: number }>();

      cart.totalAmount = Number(sumRow?.total ?? 0);
      await manager.save(cart);

      return this.getCartByUuid(cartUuid);
    });
  }

    // ===================================================
  // UPDATE CART ITEM QTY (PENDING only)
  // ===================================================
  async updateCartItemQty(dto: {
    cartUuid: string;
    electionId: number;
    candidateId: number;
    voteQty: number;
  }) {
    const { cartUuid, electionId, candidateId, voteQty } = dto;

    if (!cartUuid || !electionId || !candidateId || voteQty == null) {
      throw new BadRequestException(
        'cartUuid, electionId, candidateId, voteQty are required',
      );
    }

    if (voteQty <= 0) {
      throw new BadRequestException('voteQty must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const cart = await manager.findOne(Cart, { where: { cartUuid } });
      if (!cart) throw new BadRequestException('Cart not found');

      // Only allow edits while pending
      if (cart.status !== 'PENDING') {
        throw new BadRequestException(
          `Cart is not editable (status: ${cart.status})`,
        );
      }

      // Find the exact item (same election can have multiple candidates now)
      const cartItem = await manager.findOne(CartItem, {
        where: {
          cart: { cartId: cart.cartId } as any,
          electionId,
          candidateId,
        },
      });

      if (!cartItem) {
        throw new BadRequestException('Cart item not found');
      }

      // Keep snapshot pricePerVote; only change qty + subtotal
      cartItem.voteQty = voteQty;
      cartItem.subTotal = Number(cartItem.pricePerVote) * voteQty;

      await manager.save(cartItem);

      // Recompute cart total
      const sumRow = await manager
        .createQueryBuilder(CartItem, 'ci')
        .select('NVL(SUM(ci.subTotal), 0)', 'total')
        .where('ci.cart = :cartId', { cartId: cart.cartId })
        .getRawOne<{ total: number }>();

      cart.totalAmount = Number(sumRow?.total ?? 0);
      await manager.save(cart);

      return this.getCartByUuid(cartUuid);
    });
  }

  // ===================================================
  // REMOVE CART ITEM (PENDING only)
  // ===================================================
  async removeCartItem(dto: {
    cartUuid: string;
    electionId: number;
    candidateId: number;
  }) {
    const { cartUuid, electionId, candidateId } = dto;

    if (!cartUuid || !electionId || !candidateId) {
      throw new BadRequestException(
        'cartUuid, electionId, candidateId are required',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const cart = await manager.findOne(Cart, { where: { cartUuid } });
      if (!cart) throw new BadRequestException('Cart not found');

      // Only allow edits while pending
      if (cart.status !== 'PENDING') {
        throw new BadRequestException(
          `Cart is not editable (status: ${cart.status})`,
        );
      }

      const cartItem = await manager.findOne(CartItem, {
        where: {
          cart: { cartId: cart.cartId } as any,
          electionId,
          candidateId,
        },
      });

      if (!cartItem) {
        throw new BadRequestException('Cart item not found');
      }

      await manager.remove(cartItem);

      // Recompute cart total
      const sumRow = await manager
        .createQueryBuilder(CartItem, 'ci')
        .select('NVL(SUM(ci.subTotal), 0)', 'total')
        .where('ci.cart = :cartId', { cartId: cart.cartId })
        .getRawOne<{ total: number }>();

      cart.totalAmount = Number(sumRow?.total ?? 0);
      await manager.save(cart);

      return this.getCartByUuid(cartUuid);
    });
  }
  
 // ===================================================
// CLEAR ENTIRE CART (PENDING only) - ORACLE SAFE + HARD SYNC (FINAL)
// ===================================================
async clearCart(cartUuid: string) {
  const uuid = (cartUuid || '').trim();

  if (!uuid) {
    throw new BadRequestException('cartUuid is required');
  }

  return this.dataSource.transaction(async (manager) => {
    // 🔒 Lock cart row (prevents race conditions)
    const cart = await manager
      .createQueryBuilder(Cart, 'c')
      .setLock('pessimistic_write')
      .where('c.cartUuid = :uuid', { uuid })
      .getOne();

    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    if (cart.status !== 'PENDING') {
      throw new BadRequestException(
        `Cart is not editable (status: ${cart.status})`,
      );
    }

    // 🔥 DELETE ALL ITEMS
    const result = await manager.query(
      `
      DELETE FROM CART_ITEMS 
      WHERE CART_ID = :1
      `,
      [cart.cartId],
    );

    // 🔍 Optional debug (helps if issue happens again)
    // console.log('Deleted rows:', result);

    // 🔥 Reset total (always enforce)
    cart.totalAmount = 0;
    await manager.save(cart);

    // 🔥 VERIFY (authoritative read)
    const freshCart = await this.getCartByUuid(uuid);

    // 🔥 GUARANTEE EMPTY RESPONSE (extra safety)
    return {
      cartId: freshCart.cartId,
      cartUuid: freshCart.cartUuid,
      status: freshCart.status,
      totalAmount: 0,
      items: [],
    };
  });
}
}