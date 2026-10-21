import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RestockIngredientDto {
  @IsNumber()
  @Min(0.1, { message: 'Số lượng nhập thêm phải lớn hơn 0' })
  addAmount: number;
}

export class UpdateIngredientStockDto {
  @IsNumber()
  @Min(0, { message: 'Tồn kho không được âm' })
  stock: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minThreshold?: number;
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
}

export class UpsertRecipeDto {
  @IsInt()
  productId: number;

  @IsInt()
  ingredientId: number;

  @IsString()
  @IsNotEmpty()
  size: string; // 'S' | 'M' | 'L' | 'ALL'

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

export class UpdateToppingRecipeDto {
  @IsOptional()
  @IsString()
  toppingName?: string;

  @IsNumber()
  @Min(0.01, { message: 'Định lượng tiêu hao phải lớn hơn 0' })
  amount: number;
}
