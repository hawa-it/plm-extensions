$(document).ready(function() {
    
    var newURL  = "https://developer.api.autodesk.com/authentication/v1/authorize";
        newURL += "?response_type=code";
        newURL += "&scope=data:read";
        newURL += "&client_id=" + clientId;
        newURL += "&redirect_uri=" + redirectUri;
    
    window.location = newURL;
    
});