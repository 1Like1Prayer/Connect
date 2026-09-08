export const validationCopy = {
  required: 'Enter a value.',
  invalid: 'Enter a valid value.',
  option: 'Choose a valid option.',
  minimum: (value: number | bigint) => `Enter a value of at least ${value}.`,
  maximum: (value: number | bigint) => `Enter a value no greater than ${value}.`,
  minLength: (value: number | bigint) => `Use at least ${value} characters.`,
  maxLength: (value: number | bigint) => `Use no more than ${value} characters.`,
  minimumItems: (value: number | bigint) => `Choose at least ${value} options.`,
  maximumItems: (value: number | bigint) => `Choose no more than ${value} options.`,
  multiple: (value: number | bigint) => `Enter a multiple of ${value}.`,
} as const
