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
        requirements                 : 835,

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
            defaultBOMView : 'Basic', // This BOM view should contain columns Descriptor, Number (see next setting) and BOM Quantity only
            fieldIdNumber  : 'ARTIKEL'
        }
    },

    viewer : {
        numberProperties   : ['TEILENUMMER', 'Artikelnummer', 'Bauteilnummer', 'Dokumentnummer_ERP', 'Dokumentnummer_ERP', 'V_Name'], //'Part Number', 'Name', 'label', 'Artikelnummer', 'Bauteilnummer'
     //   suffixPrimaryFile  : ['.iam.dwf', '.iam.dwfx', '.ipt.dwf', '.ipt.dwfx'],
        suffixPrimaryFile  : ['dwf', 'dwfx', 'stp', 'step'],
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
    compare        : {
        panels : {
        insertBOMLeft : {
            fieldsIn : ['Revision', 'Quantity']
        },
        insertBOMRight : {
            fieldsIn : ['Revision', 'Quantity']
        }
    },
    viewerFeatures : {
        contextMenu : true,
        properties  : true,
        settings    : true,
        selectFile  : true
    }    
    },
    configurator   : {},
    dashboard      : {},
    editor         : {
        requirements : {
            wsMain     : {
                workspaceId   : 835,
                workspaceName : 'Requirements Custom',
                bomViewName   : 'Requirements Overview',
                advancedFieldIds      : [ 'MATERIAL_COST', 'TOOLING_COST', 'EFFORT', 'TEST_PROCEDURE', 'EXPECTED_RESULT', 'SUCCESS_CRITERIA', 'REQ_LEVEL', 'SOURCE', 'TYPE', 'CHAPTER', 'REQUIREMENT_PRIORITY' ], // CHAPTER: also written by moves in the chapter view
                newDefaultValues      : [
                    [ 'REQUIREMENT_TYPE', { link : '/api/v3/lookups/CUSTOM_LOOKUP_REQUIREMENT_TYPE_LEVEL/options/2' } ], // Specification (new root structure)
                ],
                newChildDefaultValues : [
                    [ 'REQUIREMENT_TYPE', { link : '/api/v3/lookups/CUSTOM_LOOKUP_REQUIREMENT_TYPE_LEVEL/options/1' } ], // Project (new child requirement)
                ],
                newChildCategoryChoices : [ // Offered as a REQ CATEGORY dropdown on new child requirements; first entry is the default
                    { label : 'Project', link : '/api/v3/lookups/CUSTOM_LOOKUP_REQUIREMENT_TYPE_LEVEL/options/1' },
                    { label : 'Catalog', link : '/api/v3/lookups/CUSTOM_LOOKUP_REQUIREMENT_TYPE_LEVEL/options/3' }
                ],
                reqLevelRank : { // Mirrors lib_validateReqLevelHierarchy() in Fusion Manage (REQ - Validate Requirement.js):
                    'Stakeholder Requirement' : 1, // rank must never decrease going down the BOM tree
                    'Product Requirement'     : 2,
                    'Component Requirement'   : 3
                }
            },
            wsContexts : [{
                workspace : 'products',
                fieldIds  : {
                    link  : 'PRODUCT_REQUIREMENTS',  // Field in context workspaces referencing the Requirements Structure
                    title : 'TITLE'                  // Title field being used as default title for the new root element
                }
            },{
                workspace : 'equipments'
            }],
            dashboard : { // Requirements Dashboard (custom/editor.js), always shows the saved state of the open structure
                bomViewName : 'Requirements Dashboard', // Own BOM view, so the editor's "Requirements Overview" stays untouched
                fieldIds    : {
                    level      : 'REQ_LEVEL',
                    source     : 'SOURCE',
                    type       : 'TYPE',
                    lifecycle  : 'LIFECYCLE',
                    category   : 'REQUIREMENT_TYPE',  // Field name "REQ CATEGORY"
                    reused     : 'REUSED',
                    change     : 'WORKING_CHANGE_ORDER',    // "Change Pending": open Requirement Approval (workspace 508)
                    validation     : 'LATEST_VALIDATION_RESULT', // Written by "REQ - Requirement Validations WF Actions.js" on CLOSE_1
                    validationDate : 'LATEST_VALIDATION_DATE'    // Written by the same script, enables chart "Age of Latest Validation"
                },
                categoryOrder     : [ 'Specification', 'Project', 'Catalog' ], // REQ CATEGORY values in display order
                assessmentFields  : [ // Optional charts, e.g. { fieldId : '<ID>', label : 'Priority Assessment', order : [ ... ] } - field IDs still to be confirmed
                ],
                lifecycleDone     : 'Released', // Counts as done, every other lifecycle value as open (except archived)
                lifecycleArchived : 'Archived', // Second target lifecycle of Requirement Approvals, neither done nor open
                categoryCatalog   : 'Catalog',  // REQ CATEGORY value of catalog requirements
                approvalStates    : {           // Workflow states of Requirement Approvals (workspace 508)
                    preparation : [ 'Definition' ],
                    review      : [ 'Internal Review', 'External Review' ]
                },
                validationResults : [ 'Success', 'Conditional Success', 'Failed', 'Pending' ], // Display order, values as written by the script above
                validationFailed  : 'Failed',
                testDefinitionFieldIds : [ 'TEST_PROCEDURE', 'EXPECTED_RESULT', 'SUCCESS_CRITERIA' ] // Optional in the BOM view, enables tile "Not Validatable"
            },
            specificationSync : { // Runs the existing on-demand action on the specification (custom/editor.js): sets RELATED SPECIFICATION etc. in the whole BOM
                enabled       : true,
                scriptName    : 'REQ - Requirements BOM Sync_Add Action', // uniqueName of the on-demand action in workspace 835
                resultFieldId : 'BOM_SYNC_RESULT',      // Written by the action on the specification, shown as message
                afterSave     : true,                    // Also run after a save that created or newly linked requirements
                labels        : {             // Also used by the combined "Sync" button (specification sync + reused sync)
                    button   : 'Sync',
                    running  : 'Syncing ...',
                    title    : 'Sync',
                    tooltip  : 'Sets Related Specification and the fields taken over from the specification, then checks which requirements are reused',
                    notFound : 'On-demand action "{name}" not found in this workspace.',
                    noSpec   : 'No specification found for this structure.'
                }
            },
            chapterView : { // Read-only chapter view (custom/editor.js), groups the loaded structure like the department's Excel
                enabled            : true,
                fieldIdChapter     : 'CHAPTER',  // Single Line Text, must be part of the BOM view "Requirements Overview"
                fieldIdRegister    : 'REQ_LEVEL', // Registers are derived from REQ LEVEL (CUSTOM_LOOKUP_REQ_LEVEL), no separate field
                fieldIdReqLevel    : 'REQ_LEVEL', // Only used by the optional reqLevel check per register below
                chapterSort        : 'first-occurrence', // or 'alphanumeric' (e.g. for "01 Plattform & Normen")
                hideEmptyRegisters : false,              // false: empty registers are shown greyed out with (0)
                allowMove          : true,               // Drag & drop between chapters, saved with the Content Editor (needs CHAPTER in advancedFieldIds)
                allowEdit          : true,               // Title and description editable here, saved with the Content Editor
                editFields         : [ 'REQ_LEVEL', 'SOURCE', 'TYPE', 'REQUIREMENT_PRIORITY' ], // Further fields in the edit area, must be in advancedFieldIds; REQ_LEVEL moves the requirement to another tab (No Chapter)
                allowDelete        : true,               // Removes requirements from this structure (BOM link), saved with the Content Editor
                allowCreate        : true,               // New requirements per chapter, appended directly below the root (needs CHAPTER and REQ_LEVEL in advancedFieldIds)
                columns : [                              // Only fields contained in the BOM view
                    { fieldId : 'ID',          label : 'ID'          },
                    { fieldId : 'TITLE',       label : 'Title'       },
                    { fieldId : 'DESCRIPTION', label : 'Description' },
                    { fieldId : 'REQUIREMENT_PRIORITY', label : 'Priority' } // REQ Level is given by the tab already
                ],
                registers : [                            // Order = order of the tabs; value = REQ LEVEL value exactly as in Fusion (case-insensitive)
                    { label : 'Stakeholder',       value : 'Stakeholder Requirement'        },
                    { label : 'Tech Product',      value : 'Product Requirement'            },
                    { label : 'Digital Product',   value : 'Digital Product Requirement'    },
                    { label : 'Tech Component',    value : 'Component Requirement'          },
                    { label : 'Digital Component', value : 'Digital Component Requirements' } // Plural as defined in the picklist
                ],
                labels : {
                    toggle        : 'Chapter View',
                    unassigned    : 'Unassigned',
                    noChapter     : 'No Chapter',
                    staleHint     : 'Loaded state. Unsaved changes appear after saving and reloading.',
                    missingField  : 'Field not found in BOM view',
                    emptyRegister : '0 Requirements',
                    levelMismatch : 'REQ Level does not match this register. Expected: {expected}, actual: {actual}',
                    notFound      : 'This requirement is no longer part of the Content Editor.',
                    save          : 'Save All Changes',
                    moveHint      : 'Click selects a row, double-click edits title and description, drag rows onto a chapter to move them, Ctrl / Shift + click selects several rows.',
                    newChapter    : 'New chapter name',
                    addChapter    : 'Add Chapter',
                    pending       : '{count} unsaved chapter change(s)',
                    locked        : 'Locked, this requirement cannot be changed here',
                    notEditable   : 'Moving rows needs {field} as editable Advanced Field.',
                    newRequirement: '+ New Requirement',
                    title         : 'Title',
                    description   : 'Description',
                    create        : 'Create',
                    cancel        : 'Cancel',
                    edit          : 'Edit',
                    apply         : 'Apply',
                    openInEditor  : 'Open in Editor',
                    delete        : 'Delete',
                    undoDelete    : 'Undo delete',
                    deletedByParent : 'Removed together with its parent requirement',
                    confirmChildren : '"{title}" has {count} sub requirement(s), they are removed from this structure as well. Continue?',
                    confirmReused : '"{title}" is used {count} times in this structure, all of them are removed. Continue?',
                    renameChapter : 'Rename chapter (all requirements in it)',
                    collapseAll   : 'Collapse all chapters',
                    expandAll     : 'Expand all chapters',
                    dropHint      : 'Drop on chapter:',
                    confirmRenameLocked : '{count} of {total} requirement(s) in "{title}" are locked and keep the old chapter name. Rename the others?',
                    confirmMerge  : 'Chapter "{title}" already exists in this register, the requirements are moved into it. Continue?',
                    newId         : '(new)',
                    levelNotFound : 'REQ Level "{value}" is not an option of the picklist, the requirement cannot be created.',
                    rootNotWorking: 'New requirements can only be added while the specification is in work (WIP).'
                }
            },
            panels : {
                insertBOM : {
                    hideDescriptor : false // Shows the item Descriptor (Number + Title) per node in the Navigator tree
                },
                insertWorkspaceSearch : {
                    searchLatestOnly   : false, // Most requirements are still Working, not yet released
                    searchReleasedOnly : false
                },
                insertWorkspaceViews : {
                    limit : 100 // Default is 25: the Add From Library list only showed the first 25 of 48 records
                }
            }
        }
    },
    explorer       : {
        panels : {
            insertBOM : {
            bomViewName : 'Basic',
            fieldsEx    : ['ARTIKEL', 'Descriptor', 'Category Code', 'Open in Vault']
        },

        insertDetails : {
            sectionsEx     : ['AML Summary', 'Sourcing Summary', 'Others', 'HIDDEN'],
            expandSections : ['Article'],
            fieldsEx       : ['ACTIONS', 'OPEN_IN_VAULT', 'BOM_COMPARISON', 'PLM_PORTAL', 'MBOM_EDITOR_NEW', 'VBOM_EDITOR']
        }

    },
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
    matrix         : {
        'hawa-requirements' : { // Aufruf: /matrix?wsId=835&dmsId=<Spezifikation oder Unterartikel>&profile=hawa-requirements
            labels : {
                applicationTitle : 'Requirements Validation Dashboard',
                buttonCreateNew : {
                    label : 'New Requirement Validation',
                    title : 'Click to create new Requirement Validation process'
                },
                latestColumnTitle : 'Latest Result'
            },
            context : {
                fieldIdTree    : '', // Leer: Baum = Wurzel (root) des Kontextartikels, siehe dev/matrix.js
                fieldIdColumns : ''  // Leer: Spalten werden über columns.search gefunden
            },
            columns : {
                fieldIds : {
                    title    : 'ID',
                    subtitle : 'TARGET_DATE_2', // Target Date Execution
                    sort     : 'TARGET_DATE_2'
                },
                search : { // Validierungen (Workspace 507), deren RELATED_SPECIFICATION auf die Wurzel zeigt
                    workspaceId       : 507,
                    fieldIdContext    : 'RELATED_SPECIFICATION',
                    comparator        : 'starts-with', // Fusion speichert den Titel mit Revision, z.B. 'REQS-00012 - Junior Automatic REV:w'
                    additionalFilters : []
                },
                sortDirection : 'descending',
                grid : {
                    fieldIdLink   : 'BASE_REQUIREMENT',
                    fieldIdLabel  : 'RESULT',
                    defaults      : [
                        { fieldId : 'RESULT', value : '/api/v3/lookups/CUSTOM_LOOKUP_REQUIREMENT_TEST_RESULT/options/1' } // Pending
                    ],
                    fieldMapping : [ // Quellen müssen in der BOM-Ansicht von panels.insertBOM enthalten sein
                        { grid : 'TEST_PROCEDURE'  , source : 'TEST_PROCEDURE'   },
                        { grid : 'EXPECTED_RESULT' , source : 'EXPECTED_RESULT'  },
                        { grid : 'SUCCESS_CRITERIA', source : 'SUCCESS_CRITERIA' }
                    ]
                }
            },
            statusDefinition : { // value = Titel in CUSTOM_LOOKUP_REQUIREMENT_TEST_RESULT
                failure : { type : 'failure', className : 'failure', value : 'Failed'   },
                missing : { type : 'missing', className : 'missing', value : 'Missing'  },
                pending : { type : 'pending', className : 'pending', value : 'Pending'  },
                success : { type : 'success', className : 'success', value : 'Success'  },
                partial : { type : 'partial', className : 'partial', value : 'Conditional Success' }
            },
            panels : {
                insertBOM            : {
                    headerLabel       : 'descriptor',
                    placeholder       : 'Find Requirement',
                    bomViewName       : 'Validation', // Enthält TEST_PROCEDURE, EXPECTED_RESULT, SUCCESS_CRITERIA
                    fieldsIn          : ['Descriptor', 'Revision'],
                    contentSize       : 'xs',
                    multiSelect       : true,
                    openSelectedInPLM : true,
                    search            : true,
                    toggles           : true,
                    treePath          : true
                },
                insertDetails        : {
                    headerLabel    : 'descriptor',
                    expandSections : ['Requirement'],
                    bookmark       : true,
                    toggles        : true
                },
                insertItemSummary    : {
                    bookmark     : true,
                    hideSubtitle : true,
                    openInPLM    : true,
                    reload       : true
                },
                insertGridRowDetails : {
                    headerLabel : 'descriptor',
                    fieldsEx    : [ 'Status', 'Step' ],
                    narrowPanel : true,
                    openInPLM   : true,
                    reload      : true
                },
                insertCreate         : {
                    headerLabel  : 'New Requirement Validation',
                    sectionsIn   : ['Summary'],
                    hideSections : true
                }
            }
        }
    },
    mbom           : {
    workspaceEBOM : {
        workspaceId : 79,
        fieldIDs : {
            mbom     : 'MANUFACTURING_BOM',
            number   : 'ARTIKEL',
            type: 'MAKE_OR_BUY',
            category : 'CATEGORY'
        }
    },
    workspaceMBOM : {
        workspaceId : 79,
        fieldIDs : {
            ebom     : 'ENGINEERING_BOM',
            number   : 'ARTIKEL',
            title    : 'BEZEICHNUNG1_ITEM',
            type: 'MAKE_OR_BUY',
            category : 'CATEGORY'
        }
    },
    displayOptions : {
        tabOperations : false,
        bomColumnMakeBuy : false
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
        ],
        defaultValues : [
        ['MBOM_COPY', true]
    ]
    },

    switchEBOMRevision : 'working',
    pinEBOMItemsInMBOM : false,
    suffixMBOMNumber   : 'M',
    predefinedSearchesInAddItems : [
            { title : 'Purchased Parts', fieldId : 'CATEGORY', value : 'Standard Part'       },
            { title : 'Packaging Parts', fieldId : 'CATEGORY'       , value : 'Packaging Parts' },
            { title : 'Processes'      , fieldId : 'CATEGORY'       , value : 'Process'   }
        ],        
    sectionsInCreateForm : [ 'Article', 'Purchasing Informations', 'Customer Specification' ],
    },
    portal         : {
        // panels : {
        //     insertSearch : {},
        //     insertRecentItems : {},
        //     insertBOM : {},
        //     insertDetails : {},
        //     insertDetails : {},
        // },
        // viewerFeatures   : {
        //     contextMenu   : false,
        //     cube          : false,
        //     orbit         : false,
        //     firstPerson   : false,
        //     camera        : false,
        //     measure       : true,
        //     section       : true,
        //     explodedView  : true,
        //     modelBrowser  : false,
        //     properties    : false,
        //     settings      : false,
        //     fullscreen    : true,
        //     markup        : false,
        //     hide          : true,
        //     ghosting      : true,
        //     highlight     : true,
        //     single        : true,
        //     fitToView     : true,
        //     reset         : true,
        //     views         : true,
        //     selectFile    : true
        // }   
    },
    portfolio      : {},
    projects       : {},
    reports        : {},
    reviews        : {},
    sbom           : {
            appTitle : 'Vertriebs-BOM Editor',
    sourceBOM : {
        fieldId     : 'ENGINEERING_BOM',
        bomViewName : 'MBOM Transition'
    },
    targetBOM : {
        fieldId       : 'SALES_VBOM',
        bomViewName   : 'MBOM Transition',
        itemTypeValue : 'Sales BOM',
        prefixTitle   : 'VBOM ',
        filterLabelIn : 'Show items contained in Sales VBOM only',
        filterLabelEx : 'Hide items contained in Sales VBOM',
        defaults : {
            number      : { copyFrom : 'bom.ARTIKEL',            prefix : '', suffix : 'V' },
            title       : { copyFrom : 'bom.BEZEICHNUNG1_ITEM',  prefix : '', suffix : '' },
            description : { copyFrom : 'bom.BEZEICHNUNG2_ITEM',  prefix : '', suffix : '' }
        }
    },
    itemsFieldIds : {
        number      : 'ARTIKEL',
        title       : 'BEZEICHNUNG1_ITEM',
        description : 'BEZEICHNUNG2_ITEM',
        type        : 'CATEGORY_TYPE'
    },
        picklistIdItemType : 'CUSTOM_LOOKUP_WS_ARTICLE_CATEGORY',
    itemHighlight : {
        fieldId : 'SPARE_WEAR_PART'
    },
    bomTypes : [{
        mode          : 'list',
        tabLabel      : 'Vertriebs BOM',
        buttonLabels  : ['Add all recommended'],
        bomItemTypes  : ['Spare Parts List', 'Part', 'Sales Assembly', 'Assembly'],
        icon          : 'icon-details',
        color         : 'red',
        filterLabelIn : 'Show Sales List Items Only',
        filterLabelEx : 'Hide Sales Parts List Items',
        basePosNumber : 1,
        hideQuantity  : false
    }],
    enableBOMPin : true,  
    },
    service        : {},
    worklist       : {},
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
    servicesEnabled : {
        editor : true   // Specification Editor (beta)
    }   // Defines the applications to enable. When an application is set to false, an error 404 page will be shown when users try accessing the given page.
}



// ---------------------------------------------------------------------------------------------------------------------------
//  CUSTOM CHOROME EXTENSION SETTINGS
// ---------------------------------------------------------------------------------------------------------------------------
exports.chrome = {
    customStyle : true
}
