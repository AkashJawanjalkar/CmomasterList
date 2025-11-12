sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/Label"
], function (Controller, JSONModel, MessageToast, Spreadsheet, Dialog, Input, Button, VBox, Label) {
    "use strict";
    //  Ensure XLSX is available in runtime
     jQuery.sap.includeScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");


    return Controller.extend("project1.controller.View1", {

        

        onInit: function () {
            const oViewModel = new JSONModel({
                selectedType: "master"
            });
            this.getView().setModel(oViewModel, "viewState");

            const oData = new JSONModel({
                masterData: [],
                cmoData: [],
                showColumns: false
            });
            this.getView().setModel(oData, "JSONModel");
        },

        /**  Handle Excel Upload */
       onFileUpload: function (oEvent) {
    const oFile = oEvent.getParameter("files")[0];
    const oFileUploader = oEvent.getSource();

    if (!oFile) {
        sap.m.MessageBox.warning("Please choose an Excel (.xlsx) file to upload.");
        return;
    }

    const fileName = oFile.name.toLowerCase();
    if (!fileName.endsWith(".xlsx")) {
        sap.m.MessageBox.error("Invalid file type! Please upload an Excel (.xlsx) file.");
        oFileUploader.clear();
        return;
    }

    const reader = new FileReader();
    const that = this;

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (!jsonData || jsonData.length === 0) {
                sap.m.MessageBox.error("Excel file is empty or invalid.");
                return;
            }

            //  Expected columns
            const expectedColumns = ["Packaging Site ID", "User ID / Email ID"];
            const actualColumns = Object.keys(jsonData[0]);

            //  Check required columns
            const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
            if (missingColumns.length > 0) {
                sap.m.MessageBox.error(
                    "Missing required columns:\n• " + missingColumns.join("\n• ") +
                    "\n\nPlease use the correct Excel template."
                );
                return;
            }

            //  Check for extra columns (if not allowed)
            if (actualColumns.length !== expectedColumns.length) {
                sap.m.MessageBox.error(
                    "Invalid column format detected.\n\nExpected columns:\n• " +
                    expectedColumns.join("\n• ") +
                    "\n\nPlease use the correct Excel template."
                );
                return;
            }

            


          // Normalize keys and force uppercase for letters part
const mappedData = jsonData.map(item => {
    const raw = (item["Packaging Site ID"] || item["PackagingSiteID"] || "").trim();
    return {
        PackagingSiteID: raw.toUpperCase(), // convert letters to uppercase
        UserID: (item["User ID / Email ID"] || item["UserID"] || "").trim()
    };
});

// === Validate Packaging Site ID format (exactly 2 uppercase letters + 6 digits, numeric >= 000001) ===
const invalidFormat = mappedData.filter(d => {
    // Regex: 2 uppercase letters + exactly 6 digits, but not 000000
    const regex = /^[A-Z]{2}(?!000000)\d{6}$/;
    return !regex.test(d.PackagingSiteID);
});

if (invalidFormat.length > 0) {
    sap.m.MessageBox.error(
        "Upload failed:\nSome 'Packaging Site ID' values are invalid.\n\n" +
        "Expected format: XXYYYYYY (2 uppercase letters + 6 digits, e.g., AB000001, XY000245)\n" +
        "Numeric part must be a 6-digit number and at least 000001.\n\n" +
        "Please correct the following IDs:\n• " +
        invalidFormat.map(d => d.PackagingSiteID || "(empty)").join("\n• ")
    );
    return;
}


            //  Check for @viatris.com emails
            const invalidEmails = mappedData.filter(d =>
                typeof d.UserID === "string" &&
                d.UserID.toLowerCase().includes("@viatris.com")
            );
            if (invalidEmails.length > 0) {
                sap.m.MessageBox.error(
                    "Upload failed:\nSome User IDs contain '@viatris.com' which is not allowed.\n\n" +
                    "Please remove or correct these entries before uploading."
                );
                return;
            }

            //  Check for duplicate Packaging Site IDs
            const siteIds = mappedData.map(d => d.PackagingSiteID.trim());
            const duplicates = siteIds.filter((id, i) => id && siteIds.indexOf(id) !== i);
            if (duplicates.length > 0) {
                sap.m.MessageBox.error(
                    "Upload failed:\nDuplicate Packaging Site IDs found:\n\n• " +
                    duplicates.join("\n• ") +
                    "\n\nPlease ensure each Packaging Site ID is unique."
                );
                return;
            }

            //  Check for empty PackagingSiteID or UserID
            const emptyRows = mappedData.filter(d => !d.PackagingSiteID || !d.UserID);
            if (emptyRows.length > 0) {
                sap.m.MessageBox.error(
                    "Upload failed:\nSome rows have empty 'Packaging Site ID' or 'User ID / Email ID'.\n\n" +
                    "Please fill in all required fields and try again."
                );
                return;
            }

            // If all validations pass → update model
            const oModel = that.getView().getModel("JSONModel");
            oModel.setProperty("/cmoData", mappedData);
            oModel.setProperty("/showColumns", true);

            sap.m.MessageBox.success("Excel file uploaded successfully!");

        } catch (err) {
            console.error("Error parsing Excel file:", err);
            sap.m.MessageBox.error("An unexpected error occurred while reading the Excel file.");
        }
    };

    reader.readAsArrayBuffer(oFile);
}
,

        /** Download Table Data as Excel */
        // onDownloadTableData: function () {
        //     const oModel = this.getView().getModel("JSONModel");
        //     const aData = oModel.getProperty("/cmoData");

        //     if (!aData || !aData.length) {
        //         MessageToast.show("No data available for download!");
        //         return;
        //     }

        //     const oSettings = {
        //         workbook: {
        //             columns: [
        //                 { label: "Packaging Site ID", property: "PackagingSiteID" },
        //                 { label: "User ID / Email ID", property: "UserID" }
        //             ]
        //         },
        //         dataSource: aData,
        //         fileName: "CMO_User_List.xlsx"
        //     };

        //     const oSheet = new Spreadsheet(oSettings);
        //     oSheet.build()
        //         .then(() => MessageToast.show("Excel downloaded successfully!"))
        //         .finally(() => oSheet.destroy());
        // },


        onDownloadTableData: function () {
    const oTable = this.getView().byId("cmoTable");
    const oModel = this.getView().getModel("JSONModel");
    const oBinding = oTable.getBinding("rows");

    //  Get filtered & sorted data (as per table binding)
    let aFilteredData = [];
    if (oBinding) {
        aFilteredData = oBinding.getContexts().map(ctx => ctx.getObject());
    }

    //  Fallback (if no filters applied)
    if (!aFilteredData.length) {
        aFilteredData = oModel.getProperty("/cmoData") || [];
    }

    //  Validate before export
    if (!aFilteredData.length) {
        sap.m.MessageToast.show("No data available for download!");
        return;
    }

    //  Export only visible/filtered rows
    const oSettings = {
        workbook: {
            columns: [
                { label: "Packaging Site ID", property: "PackagingSiteID" },
                { label: "User ID / Email ID", property: "UserID" }
            ]
        },
        dataSource: aFilteredData,
        fileName: "CMO_User_List.xlsx"
    };

    const oSheet = new sap.ui.export.Spreadsheet(oSettings);
    oSheet.build()
        .then(() => sap.m.MessageToast.show("Filtered data downloaded successfully!"))
        .finally(() => oSheet.destroy());
}
,
        /**  Template Download */
        onDownloadSample: function () {
            const aSampleData = [
                { PackagingSiteID: "PK000001 ", UserID: "user1@example.com" },
                { PackagingSiteID: "PK000002 ", UserID: "user2@example.com" }
            ];

            const oSettings = {
                workbook: {
                    columns: [
                        { label: "Packaging Site ID", property: "PackagingSiteID" },
                        { label: "User ID / Email ID", property: "UserID" }
                    ]
                },
                dataSource: aSampleData,
                fileName: "Approved_Template.xlsx"
            };

            const oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(() => MessageToast.show("Approved template downloaded successfully!"))
                .finally(() => oSheet.destroy());
        },

        /**  Edit Row */
        // onEditRow: function (oEvent) {
        //     const oModel = this.getView().getModel("JSONModel");
        //     const oContext = oEvent.getSource().getBindingContext("JSONModel");
        //     const oRowData = oContext.getObject();
        //     const sPath = oContext.getPath();

        //     const oInputSite = new Input({ value: oRowData.PackagingSiteID });
        //     const oInputUser = new Input({ value: oRowData.UserID });

        //     const oDialog = new Dialog({
        //         title: "Edit User",
        //         type: "Message",
        //         content: new VBox({
        //             items: [
        //                 new Label({ text: "Packaging Site ID" }),
        //                 oInputSite,
        //                 new Label({ text: "User ID / Email ID" }),
        //                 oInputUser
        //             ]
        //         }),
        //         beginButton: new Button({
        //             text: "Save",
        //             type: "Emphasized",
        //             press: function () {
        //                 oModel.setProperty(sPath + "/PackagingSiteID", oInputSite.getValue());
        //                 oModel.setProperty(sPath + "/UserID", oInputUser.getValue());
        //                 MessageToast.show("Row updated successfully!");
        //                 oDialog.close();
        //             }
        //         }),
        //         endButton: new Button({
        //             text: "Cancel",
        //             press: function () {
        //                 oDialog.close();
        //             }
        //         }),
        //         afterClose: function () {
        //             oDialog.destroy();
        //         }
        //     });

        //     oDialog.open();
        // },

        /**  Edit Row */
/**  Edit Row */
onEditRow: function (oEvent) {
    const oModel = this.getView().getModel("JSONModel");
    const oContext = oEvent.getSource().getBindingContext("JSONModel");
    const oRowData = oContext.getObject();
    const sPath = oContext.getPath();

    const oInputSite = new sap.m.Input({ value: oRowData.PackagingSiteID });
    const oInputUser = new sap.m.Input({ value: oRowData.UserID });

    const oDialog = new sap.m.Dialog({
        title: "Edit User",
        type: "Message",
        content: new sap.m.VBox({
            items: [
                new sap.m.Label({ text: "Packaging Site ID" }),
                oInputSite,
                new sap.m.Label({ text: "User ID / Email ID" }),
                oInputUser
            ]
        }),
        beginButton: new sap.m.Button({
            text: "Save",
            type: "Emphasized",
            press: function () {
                const newSiteID = oInputSite.getValue().trim();
                const newUserID = oInputUser.getValue().trim();

                // ✅ Packaging Site ID Validation (XXYYYYYY)
                const siteRegex = /^[A-Z]{2}(?!000000)\d{6}$/;
                if (!siteRegex.test(newSiteID)) {
                    sap.m.MessageBox.error(
                        "Invalid 'Packaging Site ID' format.\n\n" +
                        "Expected: XXYYYYYY (2 capital letters + 6 digits, not all zeros)\n" +
                        "Example: AB000001, XY000245"
                    );
                    return;
                }

                //  User ID / Email Validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const isEmail = emailRegex.test(newUserID);

                //  Block @viatris.com Emails
                if (isEmail && newUserID.toLowerCase().includes("@viatris.com")) {
                    sap.m.MessageBox.error(
                        "Update failed:\nUser IDs containing '@viatris.com' are not allowed."
                    );
                    return;
                }

                //  If not email → must be a valid internal ID (like AK12345)
                if (!isEmail) {
                    const userIdRegex = /^[A-Za-z0-9._-]+$/;
                    if (!userIdRegex.test(newUserID)) {
                        sap.m.MessageBox.error(
                            "Invalid User ID format.\n\nPlease enter a valid User ID (e.g., AK12345 or user.name_01)."
                        );
                        return;
                    }
                }

                //  If all validations pass → Update model
                oModel.setProperty(sPath + "/PackagingSiteID", newSiteID);
                oModel.setProperty(sPath + "/UserID", newUserID);
                sap.m.MessageToast.show("Row updated successfully!");
                oDialog.close();
            }
        }),
        endButton: new sap.m.Button({
            text: "Cancel",
            press: function () {
                oDialog.close();
            }
        }),
        afterClose: function () {
            oDialog.destroy();
        }
    });

    oDialog.open();
}
,



        onReset: function () {
    const oView = this.getView();

    //  Clear File Uploader
    const oFileUploader = oView.byId("fileUploader");
    if (oFileUploader) {
        oFileUploader.clear();
    }

    //  Clear Model Data
    const oModel = oView.getModel("JSONModel");
    if (oModel) {
        oModel.setProperty("/cmoData", []);
        oModel.setProperty("/showColumns", false);
    }

    //  Disable Submit Button
    const oSubmitBtn = oView.byId("submitBtn");
    if (oSubmitBtn) {
        oSubmitBtn.setEnabled(false);
    }

    //  Toast message
    sap.m.MessageToast.show("All data has been reset.");
}


    });
});
