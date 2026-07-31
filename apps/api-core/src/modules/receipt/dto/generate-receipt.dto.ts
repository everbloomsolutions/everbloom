import { IsString, IsNotEmpty, MinLength, Length, Matches } from 'class-validator';

export class GenerateReceiptDto {
  @IsString()
  @IsNotEmpty({ message: 'Collection ID is required' })
  collectionId!: string;

  @IsString()
  @IsNotEmpty({ message: 'UPI Transaction ID/UTR is required' })
  @Length(12, 12, { message: 'UPI Transaction ID/UTR must be exactly 12 characters' })
  @Matches(/^\d{12}$/, { message: 'UPI Transaction ID/UTR must be exactly 12 digits' })
  upiTransactionId!: string;
}
