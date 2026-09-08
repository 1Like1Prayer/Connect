export const apiCopy = {
  theMapServiceIsCurrentlyUnavailablePleaseTryAgain: "The map service is currently unavailable. Please try again later.",
  tooManyMapRequestsPleaseWaitAndRetry: "Too many map requests. Please wait and retry.",
  mapServiceUnavailablePleaseRetry: (value0: string | number) => "Map service unavailable (" + String(value0) + "). Please retry.",
  theMapServiceReturnedAnUnexpectedResponsePleaseTry: "The map service returned an unexpected response. Please try again.",
} as const
