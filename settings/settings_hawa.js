// ---------------------------------------------------------------------------------------------------------------------------
//  REQUIRED CONNECTION SETTINGS
// ---------------------------------------------------------------------------------------------------------------------------
// Provide the following parameters to enable connection to your plm tenant
// You can also provide these settings by using the matching environment variables insted (i.e. CLIENT_ID). When using such environment variables, the following settings will be overridden
// The value of variable redirectUri must match your APS app's callback URL EXACTLY. If you encounter the error "400 - Invalid redirect_uri" when starting apps, please review this link for typos and any other differences.
// The 'defaultThene' setting can be overwritten with each request if needed. Simply add the parameter 'theme' to your request (ie &theme=dark or &theme=light)
// With 'enableCache' you can let the server cache defined data which does not change frequently (workspace configuration for example). This will improve performance of some interactions. However, the cache can only be cleared by restarting the server.
let clientId        = '';
let redirectUri     = 'http://localhost:8080/callback';
let tenant          = '';
let defaultTheme    = 'dark';   // Set the standard theme to dark or light
let enableCache     = false;    



// ---------------------------------------------------------------------------------------------------------------------------
//  OPTIONAL ADDITIONAL CLIENT ID FOR 2-LEGGED AUTHENTICATION
// ---------------------------------------------------------------------------------------------------------------------------
// The application USER SETTINGS MANAGER requires an APS application with Client ID and Client Secret for 2-legged authentications, please proivde the given settings in the next variables.
// This application must be different from the one provided in clientId as this time, a Client Secret is required whereas the previous application must not require a Client Secret.
// Only 2-legged applications enables impersonation - which is required for the USER SETTINGS MANAGER utility to work. 
// However, as this impacts security, its is recommended to provide the following settings only if the USER SETTINGS MANAGER will be used, maybe even only temporarily or in a local copy of this server.
// All other applications will work even if the following 2 settings are not provided as they use the clientId variable instead. 
// Note that you can also provide these settings using the given environment variables ADMIN_CLIENT_ID and ADMIN_CLIENT_SECRET.
let adminClientId     = '***********************';
let adminClientSecret = '***********************';



// ---------------------------------------------------------------------------------------------------------------------------
//  OPTIONAL VAULT SETTINGS
// ---------------------------------------------------------------------------------------------------------------------------
// These optional settings are only required for connections to Vault using the REST API BETA (i.e. when using the addins)
// The standard applications of this UX server do not require a Vault connection, the settings usually should be left blank.
let vaultGateway = '';
let vaultName    = '';



// ---------------------------------------------------------------------------------------------------------------------------
//  THEME
// ---------------------------------------------------------------------------------------------------------------------------
// Adjust the primary colors if needed. You can also use the css files to override the default application styling.
let colors = {
    red     : '#dd2222',
    yellow  : '#faa21b',
    green   : '#6a9728',
    blue    : '#0696d7',
    list    : ['#CE6565', '#E0AF4B', '#E1E154', '#90D847', '#3BD23B', '#3BC580', '#3BBABA', '#689ED4', '#5178C8', '#9C6BCE', '#D467D4', '#CE5C95']
}
let vectors = {
    red     : [221/255,  34/255, 34/255, 0.8],
    yellow  : [250/255, 162/255, 27/255, 0.8],
    green   : [106/255, 151/255, 40/255, 0.8],
    blue    : [   0.02,    0.58,   0.84, 0.8],
    gray    : [    0.8,     0.8,    0.8, 0.6],
    white   : [      1,       1,      1, 0.8],
    list    : [
        [206/255, 101/255, 101/255, 0.8],
        [224/255, 175/255,  75/255, 0.8], 
        [225/255, 225/255,  84/255, 0.8], 
        [144/255, 216/255,  71/255, 0.8], 
        [ 59/255, 210/255,  59/255, 0.8], 
        [ 59/255, 197/255, 128/255, 0.8], 
        [ 59/255, 186/255, 186/255, 0.8], 
        [104/255, 158/255, 212/255, 0.8], 
        [ 81/255, 120/255, 200/255, 0.8], 
        [156/255, 107/255, 206/255, 0.8], 
        [212/255, 103/255, 212/255, 0.8], 
        [206/255,  92/255, 149/255, 0.8]
    ]
}



// ---------------------------------------------------------------------------------------------------------------------------
//  CONFIGURATION SETTINGS for all applications
// ---------------------------------------------------------------------------------------------------------------------------
// The config objects contains all settings required by all apps. 
// Each app has a specific property for it settings (ie. the MBOM editor uses config.mbom
// Make sure to restart your server after any change to these settings
exports.config = {

    colors            : colors,
    vectors           : vectors,
    printViewSettings : false,
    
    // Provide key workspaces information
    items          : { wsId : 79, fieldIdNumber : 'ARTIKEL', name : 'Articles', fieldIdPDM : 'PDM_ITEM_ID' },
    problemReports : { wsId : 82 },
    
    // Set default settings for all viewer instances
    viewer  : {
        numberProperties        : ['Artikelnummer', 'Bauteilnummer', 'Part Number', 'Name', 'label'],
        splitPartNumberBy       : ' v',
        splitPartNumberIndexes  : [0],
        splitPartNumberSpacer   : '',
        backgroundColor         : [255, 255, 255, 255, 255, 255],
        antiAliasing            : true,
        ambientShadows          : true,
        groundReflection        : false,
        groundShadow            : true,
        lightPreset             : 4
    },

    classes : {
        viewerFeatures : {
            contextMenu   : false,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : true,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        }
    },

    configurator : {
        wsIdConfigurationFeatures : '274',
        bomViewName               : 'Configurator',
        fieldIdFeatures           : 'FEATURES',
        fieldIdOptions            : 'OPTIONS',
        fieldIdInclusions         : 'INCLUSIONS',
        fieldIdExclusions         : 'EXCLUSIONS',
        fieldIdBOM                : 'MANUFACTURING_BOM',
        fieldIdBOMType            : 'CONFIGURATION_TYPE',
        stateFeatureApproved      : 'Approved',
        labelSingleOptions        : 'Single Options',
        valueAlternatives         : 'Alternatives',
        valueOptional             : 'Optional'
    },

    dashboard : [{
        title       : 'Change Requests Management',
        wsId        : 83,
        className   : 'change-request',
        contents    : [ 
            { type : 'details'         , params : { id : 'details', collapseContents : true, editable : true, toggles : true, singleToolbar : 'controls' } },
            { type : 'attachments'     , params : { id : 'attachments', editable : true, headerLabel : 'Files', singleToolbar : 'controls', layout : 'list', tileSize : 'xs' } },
            { type : 'managed-items'   , params : { id : 'managed-items', editable : true, columnsIn : [ 'Item', 'Lifecycle', 'Problem Description', 'Proposed Change'], openInPLM : true } },
            { type : 'workflow-history', params : { id : 'workflow-history' } }
        ],
        icon     : 'icon-workflow',
        progress : [
            { label : 'Planning',    color : '#000000',     states : ['Create']  },
            { label : 'Review',      color : colors.red,    states : ['Review & Impact Analysis', 'Peform Tasks', 'Change Control Board Review']  },
            { label : 'In Work',     color : colors.yellow, states : ['Change Order in progress']   },
            { label : 'Completed',   color : colors.green,  states : ['Completed'] }
        ]
    }, {
        title       : 'Non Conformances Tracking Dashboard',
        wsId        : 98,
        className   : 'non-conformance',
        contents    : [ 
            { type : 'workflow-history', params : { id : 'workflow-history' } },
            { type : 'details'         , params : { id : 'details', collapseContents : true, editable : true, toggles : true, singleToolbar : 'controls' } },
            { type : 'markup'          , params : { id : 'markup', fieldIdViewable : 'NONCONFORMING_ITEM', markupsImageFieldsPrefix : 'IMAGE_' } },
            { type : 'attachments'     , params : { id : 'attachments', editable : true, headerLabel : 'Files', singleToolbar : 'controls', layout : 'list', tileSize : 'xs' } }
        ],
        icon            : 'icon-rules',
        fieldIdSubtitle : 'DESCRIPTION',
        progress : [
            { label : 'New',         color : colors.red,    states : ['Identification In Progress'] },
            { label : 'Analysis',    color : colors.yellow, states : ['Under Review'] },
            { label : 'Improvement', color : colors.yellow, states : ['Disposition In Progress', 'CAPA In Progress'] },
            { label : 'Closed',      color : colors.green,  states : ['Closed'] }
        ]
    },{
        title       : 'Problem Reporting Dashboard',
        wsId        : 82,
        className   : 'problem-report',
        contents    : [ 
            { type : 'workflow-history', params : { id : 'workflow-history' } },
            { type : 'details'         , params : { id : 'details', collapseContents : true, editable : true, toggles : true, singleToolbar : 'controls' } },
            { type : 'markup'          , params : { id : 'markup', fieldIdViewable : 'AFFECTED_ITEM', markupsImageFieldsPrefix : 'IMAGE_' } },
            { type : 'attachments'     , params : { id : 'attachments', editable : true, headerLabel : 'Files', singleToolbar : 'controls', layout : 'list', tileSize : 'xs' } }
        ],
        icon            : 'icon-problem',
        fieldIdSubtitle : 'DESCRIPTION',
        progress : [
            { label : 'New',         color : colors.red,    states : ['Create'] },
            { label : 'Analysis',    color : colors.yellow, states : ['Review', 'Technical Analysis'] },
            { label : 'Improvement', color : colors.yellow, states : ['CAPA in progress', 'Change Request in progress'] },
            { label : 'Completed',   color : colors.green,  states : ['Completed'] }
        ]
    },{
        title       : 'Project Tasks Management',
        wsId        : 90,
        className   : 'project-task',
        contents    : [ 
            { type : 'workflow-history', className : 'surface-level-1', params : { id : 'workflow-history' } },
            { type : 'details'         , className : 'surface-level-1', params : { id : 'details', collapseContents : true, editable : true, toggles : true, singleToolbar : 'controls' } },
            { type : 'grid'     , className : 'surface-level-1', params : { id : 'grid', editable : true, headerLabel : 'Efforts', singleToolbar : 'controls' } },
            { type : 'relationships'     , className : 'surface-level-1', params : { id : 'relationships', editable : true, headerLabel : 'Deliverables', singleToolbar : 'controls', layout : 'list', tileSize : 'xs' } },
            { type : 'attachments'     , className : 'surface-level-1', params : { id : 'attachments', editable : true, headerLabel : 'Files', singleToolbar : 'controls', layout : 'list', tileSize : 'xs' } }
        ],
        icon : 'icon-layers',
        progress : [
            { label : 'Planning',    color : colors.red,    states : ['Planning']  },
            { label : 'Assigned',    color : colors.red,    states : ['Assigned']  },
            { label : 'In Work',     color : colors.yellow, states : ['In Work']   },
            { label : 'Review',      color : colors.green,  states : ['Review']    },
            { label : 'Completed',   color : colors.green,  states : ['Completed'] }
        ]
    },{
        title       : 'Supplier Collaboration Platform',
        wsId        : 147,
        className   : 'supplier-package',
        contents    : [ 
            { type : 'details'    , className : 'surface-level-1', params : { id : 'details', collapseContents : true, editable : true, toggles : true, singleToolbar : 'controls' } },
            { type : 'attachments', className : 'surface-level-1', params : { id : 'attachments', editable : true, headerLabel : 'Files', singleToolbar : 'controls', layout : 'list', tileSize : 's' } },
            { type : 'grid'       , className : 'surface-level-1', params : { id : 'grid', editable : true, headerLabel : 'Line Items', singleToolbar : 'controls' } },
        ],
        icon : 'icon-workflow',
        progress : [
            { label : 'Planning',      color : colors.red,     states : ['Requested']  },
            { label : 'In Progress',   color : colors.yellow,  states : ['In Work', 'Clarification']   },
            { label : 'Completed',     color : colors.green,   states : ['Completed'] }
        ]
    }],

    explorer : {
        bomViewName          : 'Details', // Details Basic
        fieldIdPRImage       : 'IMAGE_1',
        fieldIdPRContext     : 'AFFECTED_ITEM',
        wsIdSupplierPackages : 147,
        kpis : [
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
            { id : 'release-date', title : 'Release Date', fieldId : 'RELEASE_DATE', type : 'days', style : 'bars', data : [] },
            { id : 'type', title : 'Type', fieldId : 'TEILEART', type : 'value', style : 'bars', data : [] },
            { id : 'top-level-class-name', title : 'Top Level Class', fieldId : 'TOP_LEVEL_CLASS', type : 'value', style : 'bars', data : [] }, // nicht genutzt
            { id : 'class-name', title : 'Class', fieldId : 'CLASS_NAME', type : 'value', style : 'bars', data : [] }, // nicht genutzt
            { id : 'pdm-category', title : 'PDM Category', fieldId : 'CATEGORY', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-location', title : 'PDM Location', fieldId : 'SOURCE', type : 'value', style : 'bars', data : [] },
            { id : 'pdm-last-modification-date', title : 'PDM Last Modification', fieldId : 'VAULT_GEZEICHNET_AM', type : 'days', style : 'bars', data : [] },
            { id : 'responsible-designer', title : 'Responsible Designer', fieldId : 'VAULT_GEZEICHNET_VON', type : 'value', style : 'bars', data : [] },
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
            { id : 'material', title : 'Material', fieldId : 'MATERIAL', type : 'value', style : 'bars', data : [] },
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
            { id : 'reach', title : 'REACH', fieldId : 'REACH', type : 'value', style : 'bars', data : [
                { value : 'Not Compliant' , color : colors.list[0], vector : vectors.red },
                { value : 'Unknown'       , color : colors.list[1], vector : vectors.yellow },
                { value : 'Not Validated' , color : colors.list[2], vector : vectors.yellow },
                { value : 'Not Required'  , color : colors.list[3], vector : vectors.list[0] },
                { value : 'Compliant'     , color : colors.list[4], vector : vectors.green }
            ] },
            { id : 'rohs', title : 'RoHS', fieldId : 'ROHS', type : 'value', style : 'bars', data : [
                { value : 'Not Compliant' , color : colors.list[0], vector : vectors.red },
                { value : 'Unknown'       , color : colors.list[1], vector : vectors.yellow },
                { value : 'Not Validated' , color : colors.list[2], vector : vectors.yellow },
                { value : 'Not Required'  , color : colors.list[3], vector : vectors.list[0] },
                { value : 'Compliant'     , color : colors.list[4], vector : vectors.green }
            ]}
        ],
        viewerFeatures: {
            contextMenu   : true,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : true,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        }
    },

    impactanalysis : {
        fieldIdProposedChange             : 'PROPOSED_CHANGE',
        fieldIdStockQuantity              : 'STOCK_QUANTITY',
        fieldIdNextProductionOrderQantity : 'NEXT_PO_QUANTITY',
        fieldIdPendingSupplies            : 'PENDING_SUPPLIES',
        fieldIdProductionOrdersData       : 'PO_DATA',
        viewerFeatures: {
            contextMenu   : false,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : false,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        }
    },
    
    insights : {
        maxLogEntries       : 500000, // The total number of log entries being processed. Increasing this value may impact performance.
        maxEventLogEntries  : 10000, // Set this to 0 in order to disable the Event Log tab overall; a maximum of 50.000 gets applied anyway
        usersExcluded       : ['Administrator', 'Import User', 'Job User', 'Integration User'],
        workspacesExcluded  : ['Approval Lists', 'Change Approval Templates', 'Checklist Templates', 'Project Templates']
    },

    mbom : {
        wsIdEBOM                      : '79',
        wsIdMBOM                      : '79',
        bomViewNameEBOM               : 'MBOM Transition',
        bomViewNameMBOM               : 'MBOM Transition',
        fieldIdEBOM                   : 'ENGINEERING_BOM', //EBOM
        fieldIdMBOM                   : 'MANUFACTURING_BOM', //MBOM
        fieldIdNumber                 : 'ARTIKEL', //NUMBER
        fieldIdTitle                  : 'BENENNUNG1_DOC', //TITLE
        fieldIdCategory               : 'CATEGORY', //PDM_CATEGORY
        fieldIdProcessCode            : 'PROCESS_CODE',
        fieldIdEndItem                : 'END_ITEM',
        fieldIdMatchesMBOM            : 'MATCHES_MBOM',
        fieldIdIgnoreInMBOM           : 'IGNORE_IN_MBOM',
        fieldIdIsProcess              : 'IS_PROCESS',
        fieldIdLastSync               : 'LAST_MBOM_SYNC',
        fieldIdLastUser               : 'LAST_MBOM_USER',
        fieldIdEBOMItem               : 'IS_EBOM_ITEM',
        fieldIdEBOMRootItem           : 'EBOM_ROOT_ITEM',
        fieldsToCopy                  : ['BEZEICHNUNG1_ITEM','BEZEICHNUNG2_ITEM','BENENNUNG1_DOC', 'BENENNUNG2_DOC','PROJEKT','VERANTWORTLICHER_BEREICH','COMMENTS'],
        fieldIdInstructions           : 'INSTRUCTIONS',
        fieldIdMarkupSVG              : 'MARKUP_SVG',
        fieldIdMarkupState            : 'MARKUP_STATE',
        revisionBias                  : 'working', // change to release if needed
        pinMBOMItems                  : false,
        suffixItemNumber              : 'M',
        incrementOperatonsItemNumber  : true,
        newDefaults                   : [ 
            //['TYPE',        { link : '/api/v3/lookups/CUSTOM_LOOKUP_ITEM_TYPES/options/34'      }],
            //['MAKE_OR_BUY', { link : '/api/v3/lookups/CUSTOM_LOOKUP_ITEM_MAKE_OR_BUY/options/2' }]
			['MBOM_COPY', 'true' ]
        ],
        searches : [
            { 'title' : 'Purchased Parts', 'query' : 'ITEM_DETAILS:CATEGORY="Standard Part"' },
            { 'title' : 'Packaging Parts', 'query' : 'ITEM_DETAILS:CATEGORY="Packaging Parts"' }		
        //    { title : 'Purchased Parts', query : 'ITEM_DETAILS:MAKE_OR_BUY%3DBuy' },
        //    { title : 'Packaging Parts', query : 'ITEM_DETAILS:TYPE%3DPackaging'  },
        //    { title : 'Processes'      , query : 'ITEM_DETAILS:TYPE%3DProcess'    }
        ],
        sectionInCreateForm : ['Basic', 'Technical Details'],
        viewerFeatures : {
            contextMenu   : true,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : false,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        }
    },

    portal : {
        autoClick        : true,
        workspacesIn     : ['Articles'], //Items
        expandSections   : ['Basic'],
        sectionsExcluded : ['AML Summary', 'Quality Inspection', 'Sustainability', 'Compliance', 'Others'],
        sectionsIncluded : [],
        sectionsOrder    : ['Basic', 'Technical Details', 'PDM Data'],
        fieldsExcluded   : ['ESTIMATED_COST', 'PENDING_PACKAGES'],
        fieldsIncluded   : [],
        viewerFeatures   : {
            contextMenu   : true,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : false,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        }
    },  

    portfolio : {
        bomViewName       : 'Details', //Basic
        hierarchy         : ['Product Categories', 'Product Lines', 'Products'],
        viewerFeatures    : {
            contextMenu   : true,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : false,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        }
    },

    projects : {
        wsIdProjects : 86,
        query        : '*'
    },

    reports : {
        startupReportNames : ['Audits by Workflow State', 'CR approval status', 'DRT: Due Dates', 'Project Planned Effort', 'PR: Problem Report Sources', 'PR: Priority of PRs in progress', 'EX: Change Requests'],
        startupReportCount : 5
    },

    reviews : {
        fieldIdItem   : 'ITEM',
        fieldIdImage  : 'IMAGE',
        fieldIdMarkup : 'MARKUP',
        transitionId  : 'CLOSE_REVIEW',
        bomViewName   : 'Basic',
        viewerFeatures  : {
            contextMenu   : false,
            cube          : false,
            orbit         : false,
            firstPerson   : false,
            camera        : false,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : false,
            properties    : false,
            settings      : false,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        },
        workspaces    : {
            reviews : {
                id        : 76,
                sections  : [ { name : 'Review Findings' } ],
                states    : [ 'Planning', 'Preparation', 'In Progress' ]
            },
            tasks : {
                id        : 77,
                sections  : [ { name : 'Definition' }, { name : 'Schedule' } ],
                states    : [ 'Assigned', 'On Hold', 'In Work', 'Review', 'Complete' ]
            }
        }
    },

    service : {
        applicationFeatures : {
            homeButton            : true,
            toggleItemAttachments : true,
            toggleItemDetails     : true,
            productDocumentation  : true,
            manageProblemReports  : true,
            showStock             : true,
            requestWorkflowActions: true
        },
        wsIdProducts           : 95,
        productsListHeader      : 'Serviceable Products',
        productsFilter         : '',
        productsSortBy         : 'NUMBER',
        productsGroupBy        : 'PRODUCT_LINE',
        productsFieldIdImage   : 'IMAGE',
        productsFieldIdTitle   : 'TITLE',
        productsFieldIdSubtitle: 'DESCRIPTION',
        productsFieldIdBOM     : 'ENGINEERING_BOM',
        viewerFeatures : {
            contextMenu   : true,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : false,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        },


        bomViewName            : 'Service',
        enableCustomRequests   : true,
        endItemFilter          : { fieldId : 'SBOM_END_ITEM', value : true },
        fieldId                : 'SPARE_WEAR_PART',
        fieldValues            : ['spare part', 'yes', 'x', 'y', 'wear part'],
        fieldIdSparePartImage  : 'IMAGE',
        spartPartDetails       : ['MATERIAL', 'ITEM_WEIGHT', 'DIMENSIONS'],
        fieldIdPRImage         : 'IMAGE_1',

        wsIdProblemReports     : 82,
        wsIdSparePartsRequests : 241,
        requestSectionsExcluded: [ 'Real Time KPIs', 'Workflow Activity' ],
        requestColumnsExcluded : [ 'Line Item Cost', 'Availability [%]', 'Manufacturer', 'Manufacturer P/N', 'Unit Cost', 'Total Cost', 'Make or Buy', 'Lead Time (w)', 'Long Lead Time'],


    },

    variants : {
        wsIdItemVariants       : 208,
        variantsSectionLabel   : 'Variant Definition',
        fieldIdVariantBaseItem : 'DMS_ID_BASE_ITEM',
        fieldIdItemNumber      : 'NUMBER',
        fieldIdItemVariants    : 'VARIANTS',
        bomViewNameItems       : 'Variant Management',
        bomViewNameVariants    : 'Default View',
        viewerFeatures : {
            contextMenu   : true,
            cube          : true,
            orbit         : true,
            firstPerson   : false,
            camera        : false,
            measure       : true,
            section       : true,
            explodedView  : true,
            modelBrowser  : true,
            properties    : true,
            settings      : true,
            fullscreen    : true,
            markup        : true,
            hide          : true,
            ghosting      : true,
            highlight     : true,
            single        : true,
            fitToView     : true,
            reset         : true,
            views         : true,
            selectFile    : true
        }
    }

}



// ---------------------------------------------------------------------------------------------------------------------------
//  OVERRIDE SETTINGS WITH ENVIRONMENT VARIABLES
// ---------------------------------------------------------------------------------------------------------------------------
// Do not modify the following lines!
clientId          = (typeof process.env.CLIENT_ID           === 'undefined') ? clientId          : process.env.CLIENT_ID;
tenant            = (typeof process.env.TENANT              === 'undefined') ? tenant            : process.env.TENANT;
redirectUri       = (typeof process.env.REDIRECT_URI        === 'undefined') ? redirectUri       : process.env.REDIRECT_URI;
defaultTheme      = (typeof process.env.DEFAULT_THEME       === 'undefined') ? defaultTheme      : process.env.DEFAULT_THEME;
enableCache       = (typeof process.env.ENABLE_CACHE        === 'undefined') ? enableCache       : process.env.ENABLE_CACHE;
adminClientId     = (typeof process.env.ADMIN_CLIENT_ID     === 'undefined') ? adminClientId     : process.env.ADMIN_CLIENT_ID;
adminClientSecret = (typeof process.env.ADMIN_CLIENT_SECRET === 'undefined') ? adminClientSecret : process.env.ADMIN_CLIENT_SECRET;
vaultGateway      = (typeof process.env.VAULT_GATEWAY       === 'undefined') ? vaultGateway      : process.env.VAULT_GATEWAY;
vaultName         = (typeof process.env.VAULT_NAME          === 'undefined') ? vaultName         : process.env.VAULT_NAME;


let protocol  = redirectUri.split('://')[0];
    protocol  = (typeof process.env.PROTOCOL === 'undefined') ? protocol : process.env.PROTOCOL;

let port = process.env.PORT;

if(typeof port === 'undefined') {
    let redirectSplit = redirectUri.split(':');
    if(redirectSplit.length > 2) {
        port = redirectSplit[2].split('/')[0];
    }
}

exports.clientId          = clientId;
exports.tenant            = tenant; 
exports.redirectUri       = redirectUri;
exports.defaultTheme      = defaultTheme;
exports.enableCache       = enableCache;
exports.adminClientId     = adminClientId;
exports.adminClientSecret = adminClientSecret;
exports.vaultGateway      = vaultGateway; 
exports.vaultName         = vaultName; 
exports.protocol          = protocol;
exports.port              = port;
exports.debugMode         = true;