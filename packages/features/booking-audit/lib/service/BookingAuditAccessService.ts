import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";

export enum BookingAuditErrorCode {
    ORGANIZATION_ID_REQUIRED = "ORGANIZATION_ID_REQUIRED",
    BOOKING_NOT_FOUND_OR_PERMISSION_DENIED = "BOOKING_NOT_FOUND_OR_PERMISSION_DENIED",
    BOOKING_HAS_NO_OWNER = "BOOKING_HAS_NO_OWNER",
    OWNER_NOT_IN_ORGANIZATION = "OWNER_NOT_IN_ORGANIZATION",
    PERMISSION_DENIED = "PERMISSION_DENIED",
}

export class BookingAuditPermissionError extends Error {
    constructor(public readonly code: BookingAuditErrorCode) {
        super(code);
        this.name = "BookingAuditPermissionError";
    }
}

interface BookingAuditAccessServiceDeps {
    bookingRepository: BookingRepository;
    membershipRepository: MembershipRepository;
}

/**
 * BookingAuditAccessService - Service for checking access permissions to booking audit logs
 * Audit logs are admin-only for compliance and security purposes.
 * Regular users (including booking organizers and hosts) cannot view audit logs.
 * 
 * Access is granted if the user is an OWNER or ADMIN of:
 * 1. The team that owns the event type (for team bookings)
 * 2. The organization (for personal bookings within the org)
 */
export class BookingAuditAccessService {
    private readonly bookingRepository: BookingRepository;
    private readonly membershipRepository: MembershipRepository;

    constructor(deps: BookingAuditAccessServiceDeps) {
        this.bookingRepository = deps.bookingRepository;
        this.membershipRepository = deps.membershipRepository;
    }

    /**
     * Check if user has permission to view audit logs for a booking
     * Throws BookingAuditPermissionError if access is denied
     */
    async assertPermissions({ bookingUid, userId, organizationId }: { bookingUid: string, userId: number, organizationId: number | null }): Promise<void> {
        if (!organizationId) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.ORGANIZATION_ID_REQUIRED);
        }

        const booking = await this.bookingRepository.findByUidIncludeEventType({ bookingUid });
        if (!booking) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED);
        }

        const bookingEventType = booking.eventType;
        const bookingEventTypeTeamId = bookingEventType?.teamId ?? bookingEventType?.parent?.teamId;

        // Check team-level access for team bookings
        if (bookingEventTypeTeamId) {
            const hasTeamAccess = await this.hasAdminOrOwnerRole(userId, bookingEventTypeTeamId);
            if (hasTeamAccess) {
                return;
            }
        }

        const bookingOwnerId = booking.userId;

        if (!bookingOwnerId) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.BOOKING_HAS_NO_OWNER);
        }

        const isBookingOwnerMemberOfOrganization = await this.membershipRepository.hasMembership({ userId: bookingOwnerId, teamId: organizationId });

        if (!isBookingOwnerMemberOfOrganization) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.OWNER_NOT_IN_ORGANIZATION);
        }

        // Check org-level access for personal bookings
        const hasOrgAccess = await this.hasAdminOrOwnerRole(userId, organizationId);

        if (hasOrgAccess) {
            return;
        }
        throw new BookingAuditPermissionError(BookingAuditErrorCode.PERMISSION_DENIED);
    }

    /**
     * Check if user has ADMIN or OWNER role in a team/organization
     */
    private async hasAdminOrOwnerRole(userId: number, teamId: number): Promise<boolean> {
        const membership = await this.membershipRepository.findByUserIdAndTeamId({ userId, teamId });
        if (!membership) {
            return false;
        }
        return membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN;
    }
}
