const express   = require('express');
const axios     = require('axios');
const crypto    = require('crypto');
const router    = express.Router();


// Encodign and encryption required for code verifier and challenge
function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}



/* ------------------------------------------------------------------------------
    DEFAULT LANDING PAGE & DOCUMENTATION
   ------------------------------------------------------------------------------ */
router.get('/', function(req, res, next) {
    res.render('framework/landing', {
        title : 'PLM TS User Experiences',
        theme : (typeof req.query.theme === 'undefined') ? req.app.locals.defaultTheme : req.query.theme
    });
});
router.get('/docs', function(req, res, next) {
    res.render('framework/docs', {
        title : 'PLM UX Developer Guide',
        theme : (typeof req.query.theme === 'undefined') ? req.app.locals.defaultTheme : req.query.theme
    });
});



/* ------------------------------------------------------------------------------
    STANDARD APPLICATIONS
    router.get('/<endpoint>', function(req, res, next) { launch('<pug filename in /views>', '<page title>', req, res, next); });
   ------------------------------------------------------------------------------ */
router.get('/classes'       , function(req, res, next) { launch('apps/classes'         , 'Classification Browser'       , req, res, next); });
router.get('/client'        , function(req, res, next) { launch('apps/client'          , 'Mobile PLM Client'            , req, res, next); });
router.get('/dashboard'     , function(req, res, next) { launch('apps/dashboard'       , 'Dashboard'                    , req, res, next); });
router.get('/explorer'      , function(req, res, next) { launch('apps/explorer'        , 'Product Data Explorer'        , req, res, next); });
router.get('/impactanalysis', function(req, res, next) { launch('apps/impactanalysis'  , 'Change Impact Analysis'       , req, res, next); });
router.get('/mbom'          , function(req, res, next) { launch('apps/mbom'            , 'Manufacturing BOM Editor'     , req, res, next); });
router.get('/navigator'     , function(req, res, next) { launch('apps/navigator'       , 'Workspace Navigator'          , req, res, next); });
router.get('/portfolio'     , function(req, res, next) { launch('apps/portfolio'       , 'Product Portfolio Catalog'    , req, res, next); });
router.get('/projects'      , function(req, res, next) { launch('apps/projects'        , 'Projects Dashboard'           , req, res, next); });
router.get('/reports'       , function(req, res, next) { launch('apps/reports'         , 'Reports Dashboard'            , req, res, next); });
router.get('/reviews'       , function(req, res, next) { launch('apps/reviews'         , 'Design Reviews'               , req, res, next); });
router.get('/service'       , function(req, res, next) { launch('apps/service'         , 'Services Portal'              , req, res, next); });
router.get('/variants'      , function(req, res, next) { launch('apps/variants'        , 'Variant Manager'              , req, res, next); });



/* ------------------------------------------------------------------------------
    TUTORIAL APPLICATIONS
   ------------------------------------------------------------------------------ */
router.get('/template'      , function(req, res, next) { launch('tutorial/1-template'   , 'App Template Page'         , req, res, next); });



/* ------------------------------------------------------------------------------
    ADMINISTRATION UTILITIES
   ------------------------------------------------------------------------------ */
router.get('/insights'            , function(req, res, next) { launch('admin/insights'            , 'Tenant Insights Dashboard', req, res, next); });
router.get('/workspace-comparison', function(req, res, next) { launch('admin/workspace-comparison', 'Workspace Comparison'     , req, res, next); });



/* ------------------------------------------------------------------------------
    APPLICATIONS IN DEVELOPMENT
   ------------------------------------------------------------------------------ */
   router.get('/assets'        , function(req, res, next) { launch('dev/assets'          , 'Asset Management'            , req, res, next); });
   router.get('/browser'       , function(req, res, next) { launch('dev/browser'         , 'PLM Browser'                 , req, res, next); });
   router.get('/change'        , function(req, res, next) { launch('dev/change'          , 'Change Manager'              , req, res, next); });
   router.get('/configurator'  , function(req, res, next) { launch('dev/configurator'    , 'Product Configuration Editor', req, res, next); });
   router.get('/control'       , function(req, res, next) { launch('dev/control'         , 'Remote Device Control'       , req, res, next); });
   router.get('/customer'      , function(req, res, next) { launch('dev/customer'        , 'Customer Services'           , req, res, next); });
   router.get('/editor'        , function(req, res, next) { launch('dev/editor'          , 'Content Editor'              , req, res, next); });
   router.get('/matrix'        , function(req, res, next) { launch('dev/matrix'          , 'Portfolio Matrix'            , req, res, next); });
   router.get('/sbom'          , function(req, res, next) { launch('dev/sbom'            , 'Asset BOM Editor'            , req, res, next); });
   router.get('/specification' , function(req, res, next) { launch('dev/specification'   , 'Product Specification Editor', req, res, next); });
   
   

/* ------------------------------------------------------------------------------
    INVENTOR ADDINS
   ------------------------------------------------------------------------------ */
router.get('/addins/change'  , function(req, res, next) { launch('addins/change'  , 'Change Management'               , req, res, next); });
router.get('/addins/context' , function(req, res, next) { launch('addins/context' , 'Context Browser'                 , req, res, next); });
router.get('/addins/item'    , function(req, res, next) { launch('addins/item'    , 'Item Master'                     , req, res, next); });
router.get('/addins/search'  , function(req, res, next) { launch('addins/search'  , 'Search'                          , req, res, next); });
router.get('/addins/products', function(req, res, next) { launch('addins/products', 'Product Configuration Management', req, res, next); });



/* ------------------------------------------------------------------------------
    LAUNCH APPLICATION
   ------------------------------------------------------------------------------ */
function launch(appURL, appTitle, req, res, next) {

    let redirect = false;
    let refresh  = false;
    let now      = new Date().getTime();

    if(req.session.hasOwnProperty('headers')) {
        if(req.session.headers.hasOwnProperty('expires')) {
            let expires = new Date(req.session.headers.expires).getTime();
            if(expires > now) {
                refresh = true;
            } else {
                redirect = true;
            }
        } else {
            redirect = true;
        }
    } else {
        redirect = true;
    }

    if(redirect) {

        req.session.code_verifier  = base64URLEncode(crypto.randomBytes(32));
        req.session.code_challenge = base64URLEncode(sha256(req.session.code_verifier));

        let redirectUri = 'https://developer.api.autodesk.com/authentication/v2/authorize'
            + '?response_type=code'
            + '&client_id=' + req.app.locals.clientId
            + '&redirect_uri=' + encodeURIComponent(req.app.locals.redirectUri)
            + '&scope=data:read'
            + '&code_challenge=' + req.session.code_challenge
            + '&code_challenge_method=S256'
            + '&state=' + encodeURIComponent(req.url);
        
        res.redirect(redirectUri);

    } else {

        console.log(' ');
        console.log('  Launch Application START');
        console.log(' --------------------------------------------');

        let reqWS           = ''
        let reqDMS          = '';
        let reqPartNumber   = '';
        let reqRevisionBias = 'release';
        let reqTheme        = req.app.locals.defaultTheme;
        let reqOptions      = (typeof req.query.options === 'undefined') ? '' : req.query.options;
    
        for(key in req.query) {
            switch(key.toLowerCase()) {
                case 'wsid'         :           reqWS = req.query[key]; break;
                case 'dmsid'        :          reqDMS = req.query[key]; break;
                case 'partnumber'   :   reqPartNumber = req.query[key]; break;
                case 'revisionbias' : reqRevisionBias = req.query[key]; break;
                case 'theme'        :        reqTheme = req.query[key]; break;
            }
        }

        req.session.tenant = (typeof req.query.tenant === 'undefined') ? req.app.locals.tenant : req.query.tenant;
    
        console.log('  appURL       = ' + appURL); 
        console.log('  appTitle     = ' + appTitle); 
        console.log('  tenant       = ' + req.session.tenant); 
        console.log('  wsId         = ' + reqWS); 
        console.log('  dmsId        = ' + reqDMS); 
        console.log('  partNumber   = ' + reqPartNumber); 
        console.log('  options      = ' + reqOptions); 
        console.log('  revisionBias = ' + reqRevisionBias); 
        console.log('  defaultTheme = ' + req.app.locals.defaultTheme); 
        console.log('  theme        = ' + reqTheme); 
        console.log();
        
        if((reqPartNumber !== '') || ((reqPartNumber === '') && (appURL === 'addins/item') && (reqDMS === ''))) {

            res.render('framework/search', {
                partNumber   : reqPartNumber,
                revisionBias : reqRevisionBias,
                theme        : reqTheme
            });

        } else {

            res.render(appURL, { 
                title        : appTitle, 
                tenant       : req.session.tenant,
                wsId         : reqWS,
                dmsId        : reqDMS,
                revisionBias : reqRevisionBias,
                theme        : reqTheme,
                options      : reqOptions,
                config       : req.app.locals.config
            });    
            
        }

    }

}



/* ------------------------------------------------------------------------------
    CALLBACK & APS LOGIN
   ------------------------------------------------------------------------------ */
router.get('/callback', function(req, res, next) {
    
    console.log();
    console.log('  /callback START');
    console.log(' --------------------------------------------');
    console.log('  Target URL = ' + req.query.state);
    console.log();

    getToken(req, req.query.code, res, function() {
        res.redirect(req.query.state);
    });
        
});
function getToken(req, code, res, callback) {
    
    let data = {
        code            : code,
        code_verifier   : req.session.code_verifier,
        grant_type      : 'authorization_code',
        client_id       : req.app.locals.clientId,
        redirect_uri    : req.app.locals.redirectUri
    }

    axios.post('https://developer.api.autodesk.com/authentication/v2/token', data, {
        headers : {
            'accept'        : 'application/json',
            'content-type'  : 'application/x-www-form-urlencoded'
        }
    }).then(function (response) {

        if (response.status == 200) {               
            
            console.log();
            console.log('  Login to Autodesk Platform Services (APS) successful');
            console.log();

            let expiration = new Date();
                expiration.setSeconds(expiration.getSeconds() + (response.data.expires_in - 90));

            req.session.headers = {
                'Content-Type'  : 'application/json',
                'Accept'        : 'application/json',
                'X-Tenant'      : req.app.locals.tenant,
                'token'         : response.data.access_token,
                'Authorization' : 'Bearer ' + response.data.access_token,
                'expires'       : expiration,
                'refresh_token' : response.data.refresh_token
            };
            
            callback();

        } else {

            console.log();      
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');      
            console.log('             LOGIN FAILED');
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); 
            console.log(); 

        }

    }).catch(function (error) {

        res.render('framework/error-login', {
            title   : 'Login Error ' + error.response.status,
            code    : error.response.status,
            text    : error.response.data.error
        });


    });
    
}

module.exports = router;