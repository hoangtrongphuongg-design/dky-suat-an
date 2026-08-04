export const MEAL_TYPES = ['xe', 'dem'];

export const MEAL_TYPE_LABELS = {
  xe: 'Suất ăn xế',
  dem: 'Suất ăn đêm',
};

export function isValidMealType(value) {
  return MEAL_TYPES.includes(value);
}
