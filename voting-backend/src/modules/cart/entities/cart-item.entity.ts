import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Cart } from './cart.entity';

@Entity({ name: 'CART_ITEMS' })
export class CartItem {
  @PrimaryColumn({ name: 'CART_ITEM_ID', type: 'number' })
  cartItemId: number;

  @Column({ name: 'ELECTION_ID', type: 'number' })
  electionId: number;

  @Column({ name: 'CANDIDATE_ID', type: 'number' })
  candidateId: number;

  @Column({ name: 'VOTE_QTY', type: 'number' })
  voteQty: number;

  @Column({ name: 'PRICE_PER_VOTE', type: 'number' })
  pricePerVote: number;

  @Column({ name: 'SUB_TOTAL', type: 'number' })
  subTotal: number;

  @ManyToOne(() => Cart, cart => cart.items)
  @JoinColumn({ name: 'CART_ID' })
  cart: Cart;
}
