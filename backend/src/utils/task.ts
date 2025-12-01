import { formatToSlug } from './formatting'
import { TaskFieldRequest } from '@shared/types/src'
import { DBTask } from '@shared/db/src'

export const formatTasksForMcp = (tasks: DBTask[]) => {
  return tasks.map((task) => {
    // requiredInfo is a Json column - Kysely returns it as already parsed object
    const requiredInfo =
      typeof task.requiredInfo === 'string'
        ? JSON.parse(task.requiredInfo)
        : task.requiredInfo

    return {
      id: task.id,
      name: task.name,
      description: task.description,
      serviceArgs: formatTaskFields(requiredInfo as any),
    }
  })
}

export const formatTaskFields = (fields: TaskFieldRequest[]) => {
  return fields.map((field) => {
    return {
      name: field.name,
      nameSlug: formatToSlug(field.name),
      type: field.type,
      description: field.description,
    }
  })
}
