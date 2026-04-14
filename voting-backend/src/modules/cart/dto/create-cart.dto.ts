// src/modules/cart/dto/create-cart.dto.ts
// PURPOSE: Defines the exact shape of data the client must send when creating a cart.
// This helps validation and prevents bad data from entering the system.

import { IsArray, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// -----------------------------
// DTO for each cart item
// -----------------------------
export class CreateCartItemDto {
  // electionId: Which election the voter is voting in
  @IsNumber()
  electionId: number;

  // candidateId: Which candidate the voter selected
  @IsNumber()
  candidateId: number;

  // voteQty: How many votes they want to buy for that candidate
  @IsNumber()
  @Min(1) // must be at least 1 vote
  voteQty: number;
}

// -----------------------------
// DTO for the full cart request
// -----------------------------
export class CreateCartDto {
  // items: a list of election voting selections
  @IsArray()
  @ValidateNested({ each: true }) // validate each item inside the array
  @Type(() => CreateCartItemDto)  // tells Nest how to transform plain JSON into DTO instances
  items: CreateCartItemDto[];
}
