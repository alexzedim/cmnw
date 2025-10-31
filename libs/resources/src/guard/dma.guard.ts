export const isContractArraysEmpty = (
  timestamps: number[],
  itemIds: number[],
): boolean => {
  return timestamps.length === 0 || itemIds.length === 0;
};

/**
 * Type guard to validate and convert a value to a valid number
 * @param value - The value to validate and convert
 * @param fieldName - The name of the field for error reporting
 * @returns Object with isValid boolean and converted number value
 */
export const validateAndConvertToNumber = (
  value: unknown,
  fieldName: string,
): { isValid: boolean; value: number; error?: string } => {
  const converted = Number(value);

  if (isNaN(converted)) {
    return {
      isValid: false,
      value: 0,
      error: `Invalid ${fieldName} value: ${value}, cannot convert to number`,
    };
  }

  if (converted < 0) {
    return {
      isValid: false,
      value: converted,
      error: `Invalid ${fieldName} value: ${converted}, must be non-negative`,
    };
  }

  return {
    isValid: true,
    value: converted,
  };
};

/**
 * Type guard specifically for validating quantity values
 * @param value - The quantity value to validate
 * @returns Object with validation result and converted value
 */
export const validateQuantity = (
  value: unknown,
): { isValid: boolean; value: number; error?: string } => {
  return validateAndConvertToNumber(value, 'quantity');
};

/**
 * Type guard specifically for validating open interest values
 * @param value - The open interest value to validate
 * @returns Object with validation result and converted value
 */
export const validateOpenInterest = (
  value: unknown,
): { isValid: boolean; value: number; error?: string } => {
  return validateAndConvertToNumber(value, 'openInterest');
};

/**
 * Type guard to validate contract data before entity creation
 * @param quantity - The quantity value to validate
 * @param openInterest - The open interest value to validate
 * @returns Object with validation results for both values
 */
export const validateContractData = (
  quantity: unknown,
  openInterest: unknown,
): {
  isValid: boolean;
  quantity: { isValid: boolean; value: number; error?: string };
  openInterest: { isValid: boolean; value: number; error?: string };
} => {
  const quantityResult = validateQuantity(quantity);
  const openInterestResult = validateOpenInterest(openInterest);

  return {
    isValid: quantityResult.isValid && openInterestResult.isValid,
    quantity: quantityResult,
    openInterest: openInterestResult,
  };
};
