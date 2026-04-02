// ---------------------------------------------------------------------------------------------------------------------------
//  INSTRUCTIONS
// ---------------------------------------------------------------------------------------------------------------------------
//  This template file should be used to adjust the configuration settings of the UX server
//  Instead of changing the given settings in settings.js, it is recommended to update then in here.
//  This default file contains the most frequently changed settings only
//  Anyway, you can copy/paste any setting to be overwritten from settings.js in here
//  All settings provided in this custom file will overwrite the matching settings in settings.js
//  This only works if the exact same structure of the settings is reused
//  So if exports.config.abom.bomLabel should be changed, you have to define this value as exports.config.abom.bomLabel in here.
//  This file contains the key configuration elements already (exports.config, exports.menu, exports.chrome)
//  Do not remove these elements but instead paste the settings to change into these elements
//  You can find some exmaples of frequently changed settings below as comments
//  Changes to this file only get applied when restarting the server
// ---------------------------------------------------------------------------------------------------------------------------



// ---------------------------------------------------------------------------------------------------------------------------
//  CUSTOM WORKSPACE DEFINITION
// ---------------------------------------------------------------------------------------------------------------------------
exports.common = {

    workspaceIds : {

        // Product Development Workspaces
        changeOrders                 : 84,
        changeRequests               : 83,
        changeTasks                  : 80,
        designReviews                : 76,
        designReviewTasks            : 77,
        engineeringProjects          : 213,
        engineeringProjectActivities : 211,
        items                        : 79, //57
        nonConformances              : 98,
        problemReports               : 82,

        // Products & Projects Workspaces
        products               : 95,
        projects               : 86,
        projectTasks           : 90,

        // Supplier Collaboration Workspaces
        sparePartsRequests     : 241,
        supplierPackages       : 147,

        // Asset Management Workspaces
        orderProjects          : 283,
        orderProjectDeliveries : 279,
        assets                 : 280,
        assetItems             : 282,
        assetServices          : 284,
        serialNumbers          : 277,

    },

    workspaces: {
        items : {
            defaultBOMView : 'Tree Navigator', // This BOM view should contain columns Descriptor, Number (see next setting) and BOM Quantity only
            fieldIdNumber  : 'NUMBER'
        }
    },

    viewer : {
        numberProperties   : ['TEILENUMMER', 'Artikelnummer', 'Bauteilnummer', 'Dokumentnummer_ERP', 'Dokumentnummer_ERP', 'V_Name'], //'Part Number', 'Name', 'label', 'Artikelnummer', 'Bauteilnummer'
        suffixPrimaryFile  : ['.iam.dwf', '.iam.dwfx', '.ipt.dwf', '.ipt.dwfx'],
        extensionsIncluded : ['dwf', 'dwfx', 'nwd', 'ipt', 'stp', 'step', 'sldprt', 'pdf'],
    }

}



// ---------------------------------------------------------------------------------------------------------------------------
//  CUSTOM APPLICATION SETTINGS
// ---------------------------------------------------------------------------------------------------------------------------
exports.applications = {

    abom : {
        // bomLabel : 'Asset BOM',
        // assetItems : {
        //     workspaceId : 282
        // },
        // orderProjectDeliveries : {
        //     workspaceId : 279
        // },
    },
    classes        : {},
    configurator   : {},
    dashboard      : {},
    explorer       : {
    //    bomViewName          : 'Details', // Details Basic
    //    fieldIdPRImage       : 'IMAGE_1',
    //    fieldIdPRContext     : 'AFFECTED_ITEM',
        kpis : [
            // ------------------------------------------------------------------------------------------------------------------
            // Use the following parameters to define the KPIs:
            //  - fieldId       : Field / selectable containing the value of the KPI
            //  - sortBy        : value (numeric value), label (text being displayed) or count (item count). Default is count
            //  - sortDirection : ascending or descending. Default is descending
            //  - title         : Label being displayed as KPI title
            //  - type          : non-empty (validates if value is set or not), value, days
            // ------------------------------------------------------------------------------------------------------------------
            { id : 'lifecycle', title : 'Item Lifecycle', fieldId : 'LIFECYCLE', type : 'value', style : 'counters', data : [
                { value : 'Working',     color : colors.list[0], vector : vectors.red    },
                { value : 'Pre-Release', color : colors.list[2], vector : vectors.yellow },
                { value : 'Production',  color : colors.list[4], vector : vectors.green  }
            ]},
            { id : 'change', title : 'Pending Change', fieldId : 'Change Pending', type : 'non-empty', style : 'counters', data : [
                { value : 'Yes', color : colors.list[0], vector : vectors.red },
                { value : 'No' , color : colors.list[4], vector : vectors.green }
            ]},
            { id : 'change-order', title : 'Change Orders', fieldId : 'Change Pending', type : 'value',  style : 'bars',  data : [] },
            { id : 'revision', title : 'Revision', fieldId : 'REVISION', type : 'value', style : 'bars', data : [] },
            { id : 'status', title : 'Status', fieldId : 'STATUS', type : 'value', style : 'counters', data : [
                { value : 'Superseded', color : colors.list[0], vector : vectors.red    },
                { value : 'Working'   , color : colors.list[2], vector : vectors.yellow },
                { value : 'Latest'    , color : colors.list[4], vector : vectors.green  }
            ]},   
            { id : 'release-date', title : 'Release Date', fieldId : 'RELEASE_DATE', type : 'days', style : 'bars', data : [], sortBy : 'value', sortDirection : 'ascending' }, // nicht genutzt
            { id : 'type', title : 'Type', fieldId : 'TEILEART', type : 'value', style : 'bars', data : [] },
            { id : 'top-level-class-name', title : 'Top Level Class', fieldId : 'TOP_LEVEL_CLASS', type : 'value', style : 'bars', data : [] }, // nicht genutzt
            { id : 'class-name', title : 'Class', fieldId : 'CLASS_NAME', type : 'value', style : 'bars', data : [] }, // nicht genutzt
            { id : 'pdm-category', title : 'PDM Category', fieldId : 'CATEGORY', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-location', title : 'PDM Location', fieldId : 'SOURCE', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-last-modification-date', title : 'PDM Last Modification', fieldId : 'VAULT_GEZEICHNET_AM', type : 'days', style : 'bars', data : [], sortBy : 'value', sortDirection : 'ascending' }, // nicht genutzt
            { id : 'responsible-designer', title : 'Responsible Designer', fieldId : 'VAULT_GEZEICHNET_VON', type : 'value', style : 'bars', data : [] }, // nicht genutzt
            { id : 'spare-part', title : 'Spare Part', fieldId : 'SPARE_WEAR_PART', type : 'value', style : 'counters', data : [
                { value : '-'        , color : colors.list[0], vector : vectors.red },
                { value : 'Wear Part' , color : colors.list[2], vector : vectors.yellow },
                { value : 'Spare Part', color : colors.list[4], vector : vectors.green } // Nicht benutzt
            ]},
            { id : 'has-pending-packages', title : 'Has Pending Packages', fieldId : 'HAS_PENDING_PACKAGES', type : 'value', style : 'counters', data : [
                { value : 'Yes' , color : colors.list[0], vector : vectors.red },
                { value : '-'   , color : colors.list[2], vector : vectors.yellow },
                { value : 'No'  , color : colors.list[4], vector : vectors.green } // Nicht benutzt
            ]},
            { id : 'make-or-buy', title : 'Make or Buy', fieldId : 'MAKE_OR_BUY', type : 'value', style : 'counters', data : [
                { value : 'Buy' , color : colors.list[0], vector : vectors.red },
                { value : '-'   , color : colors.list[2], vector : vectors.yellow },
                { value : 'Make', color : colors.list[4], vector : vectors.green }
            ]},
            { id : 'vendor', title : 'Vendor', fieldId : 'VENDOR', type : 'value', style : 'bars', data : [] }, // Nicht benutzt
            { id : 'country', title : 'Country', fieldId : 'COUNTRY', type : 'value', style : 'bars', data : [] }, // Nicht benutzt
            { id : 'total-cost', title : 'Total Cost', fieldId : 'TOTAL_COST', type : 'value', style : 'bars', data : [] }, // Nicht benutzt
            { id : 'lead-time', title : 'Lead Time', fieldId : 'LEAD_TIME', type : 'value', sort : 'value', style : 'bars', data : [] }, // Nicht benutzt
            { id : 'long-lead-time', title : 'Long Lead Time', fieldId : 'LONG_LEAD_TIME', type : 'value', style : 'counters', data : [
                { value : 'Yes' , color : colors.list[0], vector : vectors.red },
                { value : '-'   , color : colors.list[2], vector : vectors.yellow },
                { value : 'No'  , color : colors.list[4], vector : vectors.green } // Nicht benutzt
            ]},
            { id : 'material', title : 'Material Reference', fieldId : 'MATERIAL_REFERENCE', type : 'value', style : 'bars', data : [] },
			{ id : 'compliance-summary', title : 'Compliance Summary', fieldId : 'MC_GRAPH', type : 'non-empty', style : 'bars', data : [
                { value : 'No' , color : colors.list[0], vector : vectors.red }, //Not Compliant
                { value : 'Unknown'       , color : colors.list[1], vector : vectors.yellow },
                { value : 'NA' , color : colors.list[2], vector : vectors.yellow }, //Not Validated
                { value : 'Yes'     , color : colors.list[4], vector : vectors.green } //Compliant
            ]},
            { id : 'total-weight', title : 'Total Weight', fieldId : 'ITEM_WEIGHT', type : 'value', style : 'bars', data : [] },
            { id : 'quality-inspection-required', title : 'Quality Inspection Required', fieldId : 'INSPECTION_REQUIRED', type : 'value', style : 'counters', data : [
                { value : 'Yes' , color : colors.list[0], vector : vectors.red },
                { value : '-'   , color : colors.list[2], vector : vectors.yellow },
                { value : 'No'  , color : colors.list[4], vector : vectors.green } // Nicht benutzt
            ]},
            { id : 'quality-inspection-result', title : 'Latest Quality Inspection Result', fieldId : 'LATEST_QI_RESULT', type : 'value', style : 'bars', data : [
                { value : '-'          , color : colors.list[3], vector : vectors.list[0] },
                { value : 'FAIL'       , color : colors.list[0], vector : vectors.red },
                { value : 'In Progress', color : colors.list[2], vector : vectors.yellow },
                { value : 'PASS'       , color : colors.list[4], vector : vectors.green } // Nicht benutzt
            ]},
			{ id : 'rohs', title : 'RoHS', fieldId : 'ROHS', type : 'value', style : 'bars', data : [
			    { value : 'No' , color : colors.list[0], vector : vectors.red }, //Not Compliant
                { value : 'Unknown'       , color : colors.list[1], vector : vectors.yellow }, 
                { value : 'Not assessed' , color : colors.list[2], vector : vectors.yellow }, //Not Validated
                { value : 'Yes'     , color : colors.list[4], vector : vectors.green } // Compliant	
			]},
 			{ id : 'reach', title : 'REACH', fieldId : 'REACH', type : 'value', style : 'bars', data : [
                { value : 'No' , color : colors.list[0], vector : vectors.red }, //Not Compliant
                { value : 'Unknown'       , color : colors.list[1], vector : vectors.yellow }, 
                { value : 'Not assessed' , color : colors.list[2], vector : vectors.yellow }, //Not Validated
             //   { value : 'Not Required'  , color : colors.list[3], vector : vectors.list[0] },
                { value : 'Yes'     , color : colors.list[4], vector : vectors.green } // Compliant
            ]    
    },
    impactanalysis : {},
    insights       : {},
    instances      : {
        // tabs : [{
        //     workspaceId : 308
        // }]
    },
    mbom           : {
         workspaceEBOM : {
             workspaceId : 79, // null uses common.workspaceIds.items per default
         }, 
         workspaceMBOM : {
             workspaceId : 79, // null uses common.workspaceIds.items per default
         }
    },
    portal         : {
        // downloadPatterns : [{
        //     fields    : ['NUMBER', 'PDM_ITEM_REVISION'],
        //     separator : ' ',
        //     label     : 'Number PDM-Revision'
        // }]        
    },
    portfolio      : {},
    projects       : {},
    reports        : {},
    reviews        : {},
    sbom           : {},
    service        : {},
    variants       : {
        // workspaceItemVariants : {
            // workspaceId : 571,
        // }
    },
    addins : {}

}



// ---------------------------------------------------------------------------------------------------------------------------
//  CUSTOM MAIN MENU SETTINGS
// ---------------------------------------------------------------------------------------------------------------------------
exports.menu = []




// ---------------------------------------------------------------------------------------------------------------------------
//  SERVER ROUTING
// ---------------------------------------------------------------------------------------------------------------------------
exports.server = {
    landingPage     : '',  // Set the default URL to be opened if no app URL is provided (default is '')
    servicesEnabled : {}   // Defines the applications to enable. When an application is set to false, an error 404 page will be shown when users try accessing the given page.
}



// ---------------------------------------------------------------------------------------------------------------------------
//  CUSTOM CHOROME EXTENSION SETTINGS
// ---------------------------------------------------------------------------------------------------------------------------
exports.chrome = {
    customStyle : true
}
