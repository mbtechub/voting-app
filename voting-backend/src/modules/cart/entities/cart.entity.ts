import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { CartItem } from './cart-item.entity';

@Entity({ name: 'CARTS' })
export class Cart {
  @PrimaryColumn({ name: 'CART_ID', type: 'number' })
  cartId: number;

  @Column({ name: 'CART_UUID' })
  cartUuid: string;

  @Column({ name: 'STATUS' })
  status: string;

@Column({
  name: 'TOTAL_AMOUNT',
  type: 'number',
  precision: 12,
  scale: 2,
  transformer: {
    to: (value: number) => value,
    from: (value: any) => (value === null || value === undefined ? 0 : Number(value)),
  },
})
totalAmount: number;


  @OneToMany(() => CartItem, item => item.cart)
  items: CartItem[];
}
