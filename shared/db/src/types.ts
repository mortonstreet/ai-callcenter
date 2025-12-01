import { Selectable, Insertable, Updateable } from "kysely";
import {
  User,
  Example,
  Organization,
  Session,
  Account,
  Agent,
  Task,
  TaskInstance,
  Recording,
  Invitation,
} from "./generated/types";


export type DBUser = Selectable<User>;
export type UpdateDBUser = Updateable<User>;
export type InsertDBUser = Insertable<User>;

export type DBAccount = Selectable<Account>;
export type UpdateDBAccount = Updateable<Account>;
export type InsertDBAccount = Insertable<Account>;

export type DBSession = Selectable<Session>;
export type UpdateDBSession = Updateable<Session>;
export type InsertDBSession = Insertable<Session>;

export type DBOrganization = Selectable<Organization>;
export type InsertDBOrganization = Insertable<Organization>;
export type UpdateDBOrganization = Updateable<Organization>;

export type DBInvitation = Selectable<Invitation>;
export type InsertDBInvitation = Insertable<Invitation>;
export type UpdateDBInvitation = Updateable<Invitation>;

export type DBExample = Selectable<Example>;
export type UpdateDBExample = Updateable<Example>;
export type InsertDBExample = Insertable<Example>;

export type DBAgent = Selectable<Agent>;
export type UpdateDBAgent = Updateable<Agent>;
export type InsertDBAgent = Insertable<Agent>;

export type DBTask = Selectable<Task>;
export type UpdateDBTask = Updateable<Task>;
export type InsertDBTask = Insertable<Task>;

export type DBTaskInstance = Selectable<TaskInstance>;
export type UpdateDBTaskInstance = Updateable<TaskInstance>;
export type InsertDBTaskInstance = Insertable<TaskInstance>;

export type DBRecording = Selectable<Recording>;
export type UpdateDBRecording = Updateable<Recording>;
export type InsertDBRecording = Insertable<Recording>;

export type DBPagination = {
  page: number;
  limit: number;
  offset: number;
};