// Task		| By	| Date		  | Modification Description
// ---------|-------|-------------|-------------------------
// 185190 	| MDL   | 08/24/16    | Created
// 223979   | SHS   | 05/15/18    | Use default culture which uses en-US if resource file for user's culture doesnot exists
// 223979   | SHS   | 05/23/18    | Added changes to handle when only some resources of a particular culture are found - show English resources in this case

System.defaultJSExtensions = true;

System.config({
    baseURL: '/SCALE',
    packages: {
        'scripts/manh/shared/': {
            defaultExtension: 'js',
            format: 'amd'
        }
    },
    map: {
        messagemodule: 'i18n/' + getUserInformationCookieValue("Environment") + '/' + _webSession.UserDefaultCulture() + '/MSG.js',
        textmodule: 'i18n/' + getUserInformationCookieValue("Environment") + '/' + _webSession.UserDefaultCulture() + '/TEXT.js',
        defaultmessagemodule: 'i18n/' + getUserInformationCookieValue("Environment") + '/' + 'en-US' + '/MSG.js',
        defaulttextmodule: 'i18n/' + getUserInformationCookieValue("Environment") + '/' + 'en-US' + '/TEXT.js'
    }
});    
 

//default load async libs
//keep a hold of promise to check resource is loaded or not as this is async
var ResourceJSPromise = System.import('scripts/manh/shared/resourcemanager').then(function (module) {
    ResourceManager = module;
}, function (error) { console.log(error) })