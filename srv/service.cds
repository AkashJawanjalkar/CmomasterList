using { usermanagement as db } from '../db/schema';

service UserManagementService {
    entity PackingSites as projection on db.PackingSites;
    entity CMOUsers as projection on db.CMOUsers;
}
