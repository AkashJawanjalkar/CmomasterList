namespace usermanagement;

using { cuid, managed } from '@sap/cds/common';

entity PackingSites : cuid, managed {
    siteID          : String(20);
    siteName        : String(100);
    status          : String(10);   // Active / Inactive
}

entity CMOUsers : cuid, managed {
    siteID          : Association to PackingSites;
    userID          : String(100);
}
