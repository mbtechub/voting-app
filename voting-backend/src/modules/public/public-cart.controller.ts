import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CartService } from '../cart/cart.service';

@Controller('public/cart')
export class PublicCartController {
  constructor(private readonly cartService: CartService) {}

  // POST /api/public/cart
  // If your CartService.createCart already creates cart + items, reuse it directly.
  @Post()
  createCart(@Body() dto: any) {
    return this.cartService.createCart(dto);
  }

  // GET /api/public/cart/:cartUuid
  @Get(':cartUuid')
  getCart(@Param('cartUuid') cartUuid: string) {
    // We'll add this method in CartService next
    return this.cartService.getCartByUuid(cartUuid);
  }

  // POST /api/public/cart/items
  @Post('items')
  addItem(@Body() dto: any) {
    // We'll add this method in CartService next
    return this.cartService.addItemToCart(dto);
  }
}
