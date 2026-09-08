export const hostingActionsCopy = {
  onlyTheHostCanRemoveSomeoneFromThisConnect: "Only the host can remove someone from this Connect.",
  attendanceCannotBeChangedAfterCancellationOrTheEnd: "Attendance cannot be changed after cancellation or the end of a Connect.",
  theHostCannotBeRemovedCancelThisConnectInstead: "The host cannot be removed. Cancel this Connect instead.",
  thisPersonIsNoLongerOnTheConfirmedList: "This person is no longer on the confirmed list.",
  wasRemovedFromTheGuestList: (name: string | number) => "" + String(name) + " was removed from the guest list.",
} as const
