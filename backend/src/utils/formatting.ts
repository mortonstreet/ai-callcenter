import slugify from 'slugify'
import { TaskField, TaskFieldType } from '@shared/types/src'

export const formatToSlug = (str: string) => {
  return slugify(str, { lower: true, strict: true })
}

export const formatTasksFieldsForMcp = (taskFields: TaskField[]) => {
  return taskFields.map((taskField) => {
    return {
      name: taskField.nameSlug,
      description: enrichDescription(taskField.description, taskField.type),
      type: taskField.type,
    }
  })
}

export const enrichDescription = (description: string, type: TaskFieldType) => {
  if (type === TaskFieldType.PHONE_NUMBER) {
    return `${description}. you can sometimes get this from your system__caller_id.`
  }
  return description
}
