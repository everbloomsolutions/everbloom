import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class GenerateReceiptDto {
  @IsString()
  @IsNotEmpty({ message: 'Collection ID is required' })
  collectionId!: string;

  @IsString()
  @IsNotEmpty({ message: 'UPI Transaction ID/UTR is required' })
  @MinLength(1, { message: 'UPI Transaction ID/UTR is required' })
  upiTransactionId!: string;
}
