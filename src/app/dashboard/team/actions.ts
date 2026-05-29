"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";
import { sendStaffInvitationEmail } from "@/lib/invite-delivery";
import { createStaffInvitation, revokeStaffInvitation } from "@/lib/tenant";

export type InviteStaffActionState = {
  ok: boolean;
  message: string;
  inviteUrl?: string;
};

const defaultAssignableRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPPORT, UserRole.ANALYST];
const internalAssignableRoles: UserRole[] = [...defaultAssignableRoles, UserRole.MAIL_TEAM];

function assertInvitePermission(role: string) {
  if (!["OWNER", "ADMIN"].includes(role)) {
    throw new Error("Only tenant owners and admins can manage staff invitations.");
  }
}

function getAssignableRoles(email: string) {
  return isSuperAdmin(email) ? internalAssignableRoles : defaultAssignableRoles;
}

export async function inviteStaffAction(
  _previousState: InviteStaffActionState,
  formData: FormData,
): Promise<InviteStaffActionState> {
  try {
    const session = await requireSession();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").trim();
    const role = String(formData.get("role") ?? "SUPPORT") as UserRole;

    assertInvitePermission(session.role);

    if (!email) {
      return {
        ok: false,
        message: "Enter the team member email first.",
      };
    }

    if (!getAssignableRoles(session.email).includes(role)) {
      return {
        ok: false,
        message: "That role is not allowed for this account.",
      };
    }

    const invitation = await createStaffInvitation({
      tenantId: session.tenantId,
      invitedByUserId: session.userId,
      email,
      name: name || undefined,
      role,
    });

    const delivery = await sendStaffInvitationEmail({
      tenantId: session.tenantId,
      invitationId: invitation.id,
      invitedByUserId: session.userId,
    });

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/audit");

    if (delivery.status === "sent") {
      return {
        ok: true,
        message: `Invitation sent to ${email}.`,
        inviteUrl: delivery.inviteUrl ?? undefined,
      };
    }

    return {
      ok: true,
      message: `Invitation created for ${email}. Email is not configured, so share the invite link manually.`,
      inviteUrl: delivery.inviteUrl ?? undefined,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create the invitation.",
    };
  }
}

export async function resendInvitationAction(invitationId: string) {
  const session = await requireSession();
  assertInvitePermission(session.role);

  await sendStaffInvitationEmail({
    tenantId: session.tenantId,
    invitationId,
    invitedByUserId: session.userId,
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/audit");
}

export async function revokeInvitationAction(invitationId: string) {
  const session = await requireSession();
  assertInvitePermission(session.role);

  await revokeStaffInvitation({
    tenantId: session.tenantId,
    invitationId,
    actorUserId: session.userId,
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/audit");
}
