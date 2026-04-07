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
            kpis : [
            // ------------------------------------------------------------------------------------------------------------------
            // Use the following parameters to define the KPIs:
            //  - fieldId       : Field / selectable containing the value of the KPI
            //  - sortBy        : value (numeric value), label (text being displayed) or count (item count). Default is count
            //  - sortDirection : ascending or descending. Default is descending
            //  - digits        : in case of float fields, defines digits to be displayed in bars (default is 2)
            //  - title         : Label being displayed as KPI title
            //  - type          : non-empty (validates if value is set or not), value, days
            // ------------------------------------------------------------------------------------------------------------------
            { id : 'status', title : 'Status', fieldId : 'STATUS', type : 'value', style : 'counters', data : [
                { value : 'Superseded', color : 0, vector : 'red'    },
                { value : 'Unreleased', color : 2, vector : 'yellow' },
                { value : 'Working'   , color : 2, vector : 'yellow' },
                { value : 'Latest'    , color : 4, vector : 'green'  }
            ]},   
            { id : 'lifecycle', title : 'Lifecycle', fieldId : 'LIFECYCLE', type : 'value', style : 'counters', data : [
                { value : 'Working',     color : 0, vector : 'red'    },
                { value : 'Pre-Release', color : 2, vector : 'yellow' },
                { value : 'Production',  color : 4, vector : 'green'  }
            ]},
            { id : 'change', title : 'Pending Change', fieldId : 'WORKING_CHANGE_ORDER', type : 'non-empty', style : 'counters', data : [
                { value : 'Yes', color : 0, vector : 'red'   },
                { value : 'No' , color : 4, vector : 'green' }
            ]},
            { id : 'change-order', title : 'Change Orders', fieldId : 'WORKING_CHANGE_ORDER', type : 'value',  style : 'bars',  data : [] },
            { id : 'revision', title : 'Revision', fieldId : 'REVISION', type : 'value', style : 'bars', data : [] },
            { id : 'release-date', title : 'Release Date', fieldId : 'RELEASE_DATE', type : 'days', style : 'bars', data : [], sortBy : 'value', sortDirection : 'ascending' },
            { id : 'type', title : 'Type', fieldId : 'TYPE', type : 'value', style : 'bars', data : [] },
            { id : 'class-name', title : 'Class', fieldId : 'CLASS_NAME', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-category', title : 'PDM Category', fieldId : 'PDM_CATEGORY', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-location', title : 'PDM Location', fieldId : 'PDM_LOCATION', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-last-modification-date', title : 'PDM Last Modification', fieldId : 'PDM_LAST_MODIFICATION_DATE', type : 'days', style : 'bars', data : [], sortBy : 'value', sortDirection : 'ascending' },
            { id : 'responsible-designer', title : 'Responsible Designer', fieldId : 'RESPONSIBLE_DESIGNER', type : 'value', style : 'bars', data : [] },
            { id : 'spare-part', title : 'Spare Part', fieldId : 'SPARE_WEAR_PART', type : 'value', style : 'counters', data : [
                { value : '-'         , color : 0, vector : 'red'    },
                { value : 'Wear Part' , color : 2, vector : 'yellow' },
                { value : 'Spare Part', color : 4, vector : 'green'  }
            ]},
            { id : 'make-or-buy', title : 'Make or Buy', fieldId : 'MAKE_OR_BUY', type : 'value', style : 'counters', data : [
                { value : 'Buy' , color : 0, vector : 'red'    },
                { value : '-'   , color : 2, vector : 'yellow' },
                { value : 'Make', color : 4, vector : 'green'  }
            ]},
            { id : 'type', title : 'Type', fieldId : 'TEILEART', type : 'value', style : 'bars', data : [] },    
            { id : 'vendor', title : 'Vendor', fieldId : 'VENDOR', type : 'value', style : 'bars', data : [] },
            { id : 'country', title : 'Country', fieldId : 'COUNTRY', type : 'value', style : 'bars', data : [] },
            { id : 'long-lead-time', title : 'Long Lead Time', fieldId : 'LONG_LEAD_TIME', type : 'value', style : 'counters', data : [
                { value : 'Yes' , color : 0, vector : 'red'    },
                { value : '-'   , color : 2, vector : 'yellow' },
                { value : 'No'  , color : 4, vector : 'green'  }
            ]},
            { id : 'has-pending-packages', title : 'Has Pending Packages', fieldId : 'HAS_PENDING_PACKAGES', type : 'value', style : 'counters', data : [
                { value : 'Yes' , color : 0, vector : 'red'    },
                { value : '-'   , color : 2, vector : 'yellow' },
                { value : 'No'  , color : 4, vector : 'green'  }
            ]},
            { id : 'material', title : 'Material', fieldId : 'MATERIAL', type : 'value', style : 'bars', data : [] },
            { id : 'compliance-summary', title : 'Compliance Summary', fieldId : 'MC_GRAPH', type : 'non-empty', style : 'bars', data : [
                { value : 'No' , color : 0, vector : 'red' }, //Not Compliant
                { value : 'Unknown'       , color : 1, vector : 'yellow' },
                { value : 'NA' , color : 1, vector : 'yellow' }, //Not Validated
                { value : 'Yes'     , color : 4, vector : 'green' } //Compliant    
            ] },
            { id : 'reach', title : 'REACH', fieldId : 'REACH', type : 'value', style : 'bars', data : [
                { value : 'No' , color : 0, vector : 'red'    }, //Not Compliant
             //   { value : 'Unknown'       , color : 1, vector : 'yellow' },
                { value : 'Not assessed' , color : 2, vector : 'yellow' }, //Not Validated
             //   { value : 'Not Required'  , color : 3, vector : 0        },
                { value : 'Yes'     , color : 4, vector : 'green'  } //Compliant
            ] },
            { id : 'rohs', title : 'RoHS', fieldId : 'ROHS', type : 'value', style : 'bars', data : [
                { value : 'No' , color : 0, vector : 'red'    }, //Not Compliant
            //    { value : 'Unknown'       , color : 1, vector : 'yellow' },
                { value : 'Not assessed' , color : 2, vector : 'yellow' }, //Not Validated
                { value : 'Not Required'  , color : 3, vector : 0        },
                { value : 'Yes'     , color : 4, vector : 'green'  } //Compliant
            ]},
            { id : 'carbon-emissions', title : 'Carbon Emissions', fieldId : 'CARBON_EMISSIONS', type : 'value', style : 'bars', data : [], sortBy : 'value', sortDirection : 'descending' },
            { id : 'pdm-category', title : 'PDM Category', fieldId : 'CATEGORY', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-location', title : 'PDM Location', fieldId : 'SOURCE', type : 'value', style : 'bars', data : [] },    
            { id : 'quality-inspection-required', title : 'Quality Inspection Required', fieldId : 'INSPECTION_REQUIRED', type : 'value', style : 'counters', data : [
                { value : 'Yes' , color : 0, vector : 'red'   },
                { value : '-'   , color : 2, vector : 'yellow' },
                { value : 'No'  , color : 4, vector : 'green'  }
            ]},
            { id : 'quality-inspection-result', title : 'Latest Quality Inspection Result', fieldId : 'LATEST_QI_RESULT', type : 'value', style : 'bars', data : [
                { value : '-'          , color : 3, vector : 3        },
                { value : 'FAIL'       , color : 0, vector : 'red'    },
                { value : 'In Progress', color : 2, vector : 'yellow' },
                { value : 'PASS'       , color : 4, vector : 'green'  }
            ]},
            { id : 'weight', title : 'Weight', fieldId : 'ITEM_WEIGHT', fieldType : 'Float', type : 'value', style : 'bars', data : [], sortBy : 'value', sortDirection : 'descending', digits : 3 },    
        ],    
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
        workspaceId : 79,
        fieldIDs : {
            mbom     : 'MANUFACTURING_BOM',
            number   : 'ARTIKEL',
            category : 'CATEGORY'
        }
    },
    workspaceMBOM : {
        workspaceId : 79,
        fieldIDs : {
            ebom     : 'ENGINEERING_BOM',
            number   : 'ARTIKEL',
            title    : 'BENENNUNG1_DOC',
            category : 'CATEGORY'
        }
    },
    mbomRoot : {
        fieldsToCopy : [
            { ebom : 'BEZEICHNUNG1_ITEM',        mbom : 'BEZEICHNUNG1_ITEM' },
            { ebom : 'BEZEICHNUNG2_ITEM',        mbom : 'BEZEICHNUNG2_ITEM' },
            { ebom : 'BENENNUNG1_DOC',           mbom : 'BENENNUNG1_DOC' },
            { ebom : 'BENENNUNG2_DOC',           mbom : 'BENENNUNG2_DOC' },
            { ebom : 'PROJEKT',                  mbom : 'PROJEKT' },
            { ebom : 'VERANTWORTLICHER_BEREICH', mbom : 'VERANTWORTLICHER_BEREICH' },
            { ebom : 'COMMENTS',                 mbom : 'COMMENTS' }
        ]
    },
    newProcessDefaults : [
        ['MBOM_COPY', 'true']
    ],
    switchEBOMRevision : 'working',
    pinEBOMItemsInMBOM : false,
    suffixMBOMNumber   : 'M',
    predefinedSearchesInAddItems : [
        { title : 'Purchased Parts', query : 'ITEM_DETAILS:CATEGORY="Standard Part"' },
        { title : 'Packaging Parts', query : 'ITEM_DETAILS:CATEGORY="Packaging Parts"' }
    ],
    sectionsInCreateForm : []
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
