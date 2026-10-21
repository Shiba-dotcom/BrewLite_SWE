import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RestockIngredientDto {
  @IsNumber()
  @Min(0.1, { message: 'Số lượng nhập thêm phải lớn hơn 0' })
  addAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateIngredientStockDto {
  @IsNumber()
  @Min(0, { message: 'Tồn kho không được âm' })
  stock: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã nguyên vật liệu không được để trống' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên nguyên vật liệu không được để trống' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Đơn vị tính không được để trống' })
  unit: string;

  @IsNumber()
  @Min(0, { message: 'Tồn kho ban đầu không được âm' })
  stock: number;

  @IsNumber()
  @Min(0, { message: 'Ngưỡng cảnh báo không được âm' })
  minThreshold: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;
}

export class UpsertRecipeDto {
  @IsInt()
  productId: number;

  @IsInt()
  ingredientId: number;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsNumber()
  @Min(0.01, { message: 'Định lượng tiêu hao phải lớn hơn 0' })
  amount: number;
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsNumber()
  @Min(0.01, { message: 'Định lượng tiêu hao phải lớn hơn 0' })
  amount: number;
}

export class CreateToppingRecipeDto {
  @IsString()
  @IsNotEmpty()
  toppingId: string;

  @IsString()
  @IsNotEmpty()
  toppingName: string;

  @IsOptional()
  @IsString()
  subtext?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsInt()
  ingredientId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class UpdateToppingRecipeDto {
  @IsOptional()
  @IsString()
  toppingName?: string;

  @IsOptional()
  @IsString()
  subtext?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}

export class UpdateSizePricingDto {
  @IsNumber()
  @Min(0)
  sizeS: number;

  @IsNumber()
  @Min(0)
  sizeM: number;

  @IsNumber()
  @Min(0)
  sizeL: number;
}

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVoucherDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
