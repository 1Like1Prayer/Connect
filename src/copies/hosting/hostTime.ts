export const hostTimeCopy = {
  chooseAValidTimezone: "Choose a valid timezone.",
  chooseACompleteDateAndTime: "Choose a complete date and time.",
  chooseAValidCalendarDate: "Choose a valid calendar date.",
  thisTimeDoesNotExistInBecauseTheClocks: (value0: string | number) => "This time does not exist in " + String(value0) + " because the clocks move forward. Choose another time.",
  thisLocalTimeCouldNotBeResolvedChooseAnother: "This local time could not be resolved. Choose another time.",
  thisTimeHappensTwiceChooseTheFirstOrSecond: "This time happens twice. Choose the first or second occurrence.",
} as const
