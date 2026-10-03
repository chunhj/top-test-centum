import type { AdminPollDetail, AdminPollInput, AdminPollUpdateInput } from '../api/adminApi'

/** One candidate row of the admin poll form (optionId is set only for existing candidates). */
export interface AdminPollOptionInput {
  optionId?: number
  name: string
  team: string
  imageUrl: string
}

/** Values the admin poll form submits (dates as ISO strings). */
export interface AdminPollFormValues {
  title: string
  startsAt: string
  endsAt: string
  options: AdminPollOptionInput[]
}

const toApiOption = ({ name, team, imageUrl }: AdminPollOptionInput) => ({
  name,
  team: team || undefined,
  imageUrl: imageUrl || undefined,
})

// Conversions between the admin poll form and the admin API payloads. Empty optional text
// fields are sent as undefined (omitted), matching what the server expects.

/** Form values → create request. Polls created from the console are single-choice. */
export function toAdminPollInput(values: AdminPollFormValues): AdminPollInput {
  return {
    title: values.title,
    description: '',
    pollType: 'SINGLE',
    maxSelections: 1,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    options: values.options.map(toApiOption),
  }
}

/** Form values → update request (keeps optionId so existing candidates are matched). */
export function toAdminPollUpdateInput(values: AdminPollFormValues): AdminPollUpdateInput {
  return {
    title: values.title,
    description: '',
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    options: values.options.map((option) => ({
      ...toApiOption(option),
      optionId: option.optionId,
    })),
  }
}

/** Server poll → initial form values for the edit screen. */
export function toAdminPollFormValues(poll: AdminPollDetail): AdminPollFormValues {
  return {
    title: poll.title,
    startsAt: poll.startsAt,
    endsAt: poll.endsAt,
    options: poll.options.map((option) => ({
      optionId: option.optionId,
      name: option.name,
      team: option.team ?? '',
      imageUrl: option.imageUrl ?? '',
    })),
  }
}
