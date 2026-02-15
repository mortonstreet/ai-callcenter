import type { AdminCreateOrganizationRequest } from "@/lib/shared-types";
import type { AdminCreateOrganizationMutationInput } from "./useAdmin";

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

type Assert<T extends true> = T;

type _createOrgPayloadContract = Assert<
  IsEqual<AdminCreateOrganizationMutationInput, AdminCreateOrganizationRequest>
>;

export {};
