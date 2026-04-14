// PURPOSE: Handles HTTP requests related to cart creation, retrieval,
// adding items, updating vote quantities, and removing nominees from cart.

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ---------------------------------------------------
  // CREATE CART
  // POST /api/cart
  // ---------------------------------------------------
  @Post()
  async createCart(@Body() dto: CreateCartDto) {
    return this.cartService.createCart(dto);
  }

  // ---------------------------------------------------
  // GET CART BY UUID
  // GET /api/cart/:cartUuid
  // ---------------------------------------------------
  @Get(':cartUuid')
  async getCart(@Param('cartUuid') cartUuid: string) {
    return this.cartService.getCartByUuid(cartUuid);
  }

  // ---------------------------------------------------
  // ADD ITEM TO EXISTING CART
  // POST /api/cart/:cartUuid/item
  // ---------------------------------------------------
  @Post(':cartUuid/item')
  async addItem(
    @Param('cartUuid') cartUuid: string,
    @Body()
    body: {
      electionId: number;
      candidateId: number;
      voteQty: number;
    },
  ) {
    return this.cartService.addItemToCart({
      cartUuid,
      electionId: Number(body.electionId),
      candidateId: Number(body.candidateId),
      voteQty: Number(body.voteQty),
    });
  }

  // ---------------------------------------------------
  // UPDATE VOTE QUANTITY
  // PATCH /api/cart/:cartUuid/item
  // ---------------------------------------------------
  @Patch(':cartUuid/item')
  async updateItemQty(
    @Param('cartUuid') cartUuid: string,
    @Body()
    body: {
      electionId: number;
      candidateId: number;
      voteQty: number;
    },
  ) {
    return this.cartService.updateCartItemQty({
      cartUuid,
      electionId: Number(body.electionId),
      candidateId: Number(body.candidateId),
      voteQty: Number(body.voteQty),
    });
  }

  // ---------------------------------------------------
  // REMOVE NOMINEE FROM CART
  // DELETE /api/cart/:cartUuid/item
  // ---------------------------------------------------
  @Delete(':cartUuid/item')
  async removeItem(
    @Param('cartUuid') cartUuid: string,
    @Body()
    body: {
      electionId: number;
      candidateId: number;
    },
  ) {
    return this.cartService.removeCartItem({
      cartUuid,
      electionId: Number(body.electionId),
      candidateId: Number(body.candidateId),
    });
  }

  // ---------------------------------------------------
// CLEAR CART (REMOVE ALL ITEMS)
// DELETE /api/cart/:cartUuid/clear
// ---------------------------------------------------
@Delete(':cartUuid/clear')
async clearCart(@Param('cartUuid') cartUuid: string) {
  return this.cartService.clearCart(cartUuid);
}
}