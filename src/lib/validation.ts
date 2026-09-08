import { z } from 'zod'
import { validationCopy } from '../copies/common/validation'

z.config({
  customError: issue => {
    switch (issue.code) {
      case 'too_small':
        return issue.origin === 'string' ? validationCopy.minLength(issue.minimum)
          : issue.origin === 'array' ? validationCopy.minimumItems(issue.minimum)
          : validationCopy.minimum(issue.minimum)
      case 'too_big':
        return issue.origin === 'string' ? validationCopy.maxLength(issue.maximum)
          : issue.origin === 'array' ? validationCopy.maximumItems(issue.maximum)
          : validationCopy.maximum(issue.maximum)
      case 'invalid_type':
        return issue.input === undefined || issue.input === null ? validationCopy.required : validationCopy.invalid
      case 'invalid_value':
        return validationCopy.option
      case 'not_multiple_of':
        return validationCopy.multiple(issue.divisor)
      default:
        return validationCopy.invalid
    }
  },
})
