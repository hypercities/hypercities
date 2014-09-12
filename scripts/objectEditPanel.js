/**
 * HyperCities narrativePanel Object
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2009-07-20
 * @version   $Id$
 *
 */

HyperCities.objectEditPanel = function() {

	// Private variables
	var _id = "[HyperCities.objectEditPanel] ",

		// Dom element related variables 
		_initialized   = false,
		_isSaved       = false,
		_originalMode  = HyperCities.config.MODE_DEFAULT,
		_currentMode   = HyperCities.config.MODE_EDIT_OBJECT,
		_panelWrapper  = null,  // Assigned to $('#objectEditPanelWrapper')
								// in _init()
		_sidebarWidth  = 0,
		_outTimeout    = null,  // Timeout for dropdown vanishes 

		// SubPanel related variables
		_objectData    = null,
		_objectType    = null,
		_markerType    = null,
		_kmlPreview    = null,

		// successfully approved passwords
		_passwords		= [],

		_currentObjectId = null,  // Assigned when edit existed object
		_currentParentId = null,  // The current parentId of collection

		// Current Status
		_timespan      = null,
		_baseMap       = null,
		_bookmarks     = null,

		_jHtmlarea     = null,

		IDS = {
			sidebarWrapper: "sidebarWrapper",
			panelWrapper: "objectEditPanelWrapper",
			objectEditPanel: "objectEditPanel",
			panelHead: "panelHead",
			panelBody: "panelBody",
			panelFooter: "panelFooter",
			metaForm: "HCMetaForm",
			title: "HCTitle",
			author: "HCAuthor",
			passcode: "HCPasscode",
			timeString: "HCTimeString",
			time: "HCTimeField",
			startTime: "HCStartTime",
			endTime: "HCEndTime",
			metaData: "HCMetaData",
			contentForm: "HCContentForm",
			settingForm: "HCSettingForm",
			bookSearchForm: "HCBookSearchForm",
			bookSearchKey: "HCBookSearchKey",
			isAPlace: "isAPlace",
			privilegeForm: "HCPrivilegeForm",
			mediaForm: "HCMediaForm",
			description: "HCDescription",
			license: "HCLicenseField",
			mapUrl: "HCMapUrl",
			kmlLink: "HCKMLLink",
			kmlFile: "HCKMLFile",
			command: "HCCommand",
			mediaType: "HCMediaType",
			mediaLink: "HCMediaLink",
			mediaFile: "HCMediaFile",
			uploadTarget: "HCUploadTarget",
			newName: "HCNewCollectionName",
			newPwd: "HCNewCollectionPassword",
			password: "HCCollectionPassword",
			keyword: "HCKeyword",
			ccBY: "CCBY",
			ccBYSA: "CCBYSA",
			ccBYND: "CCBYND",
			ccBYNC: "CCBYNC",
			ccBYNCSA: "CCBYNCSA",
			ccBYNCND: "CCBYNCND",
			isHidden: "HCIsHidden",
			coauthorEmail: "HCCoauthorEmail",
			searchCoauthor: "HCSearchCoauthor",
			shareAll: "HCShareAll"
		},

		// CSS classes constant used by objectEditPanel
		CLASSES = {
			objectEditPanel: "HCObjectEditPanel",
			panelHead: "HCObjectEditPanelHead",
			panelBody: "HCObjectEditPanelBody",
			panelFooter: "HCObjectEditPanelFooter",
			closeBtn: "closeBtn",
			saveBtn: "saveBtn",
			bookBtn: "bookBtn",
			toolbarBtn: "toolbarBtn",
			contentBtn: "contentBtn",
			baseMapBtn: "baseMapBtn",
			objectBtn: "objectBtn",
			shareBtn: "shareBtn",
			settingBtn: "settingBtn",
			privilegeBtn: "privilegeBtn",
			deleteBtn: "deleteBtn",
			insertBtn: "insertBtn",
			cancelBtn: "cancelBtn",
			previewBtn: "previewBtn",
			uploadKmlBtn: "uploadKmlBtn",
			uploadMediaBtn: "uploadMediaBtn",
			formItem: "formItem",
			formPromptText: "formPromptText",
			changeLicense: "changeLicense",
			licensePanel: "HCLicensePanel",
			licenseType: "HCLicenseType", 
			licenseHelp: "licenseHelp",
			collectionPanel: "HCCollectionPanel",
			searchBox: "searchBox",
			collectionBox: "collectionBox",
			collectionBtn: "collectionBtn",
			newCollectionBtn: "newCollectionBtn",
			closeCollectionBtn: "closeCollectionBtn",
			newCollectionPanel: "newCollectionPanel",
			newCollectionPanelContent: "newCollectionPanelContent",
			addBtn: "addBtn",
			passwordPanel: "passwordPanel",
			passwordPanelContent: "passwordPanelContent",
			sendPwdBtn: "sendPwdBtn",
			myCollections: "myCollections",
			otherCollections: "otherCollections",
			collectionItem: "collectionItem",
			collectionPrompt: "collectionPrompt",
			toolbar: "toolbar",
			toolPanel: "toolPanel",
			toolPanelContent: "toolPanelContent",
			mediaPanel: "mediaPanel",
			mediaPanelContent: "mediaPanelContent",
			imageHelp: "imageHelp",
			kmlHelp: "kmlHelp",
			contentPanel: "contentPanel",
			htmlArea: "jHtmlArea",
			jToolBar: "ToolBar", // Toolbar class for jHtmlArea
			kmlUploader: "HCKMLUploader",
			feedbackBox: "HCFeedbackBox",
			previewItem: "previewItem",
			previewFile: "previewFile",
			previewFilename: "previewFilename",
			previewFileTool: "previewFileTool",
			removeFile: "removeFile",
			objectPanel: "objectPanel",
			baseMapPanel: "baseMapPanel",
			webServiceMap: "webServiceMap",
			addwsMap: "addwsMap",
			mapItem: "mapItem",
			removeBaseMap: "removeBaseMap",
			currentBaseMap: "currentBaseMap",
			mapToolBox: "mapToolBox",
			baseMapList: "baseMapList",
			baseMapOC: "baseMapOC",
			mapToolBtn: "mapToolBtn",
			settingPanel: "settingPanel",
			bookPanel: "bookPanel",
			bookList: "bookList",
			bookItem: "bookItem",
			bookCover: "bookCover",
			currentBook: "currentBook",
			privilegePanel: "privilegePanel",
			coauthorItem: "coauthorItem",
			removeCoauthor: "removeCoauthor",
			blankLink: "blankLink",
			checkBox: "checkBox",
			selected: "selected",
			disabled: "disabled",
			hover: "hover",
			error: "error",
			hide: "hide",
			close: "close",
			block: "block"
		},

		// Static URL Links
		URLS = {
			licenseInfo: "http://creativecommons.org/about/licenses",
			freeHosting: "http://www.google.com/search?q=free+image+hosting",
			kmlHelp: "http://groups.google.com/group/hypercities-support",
			getCollectionName: "./queryCollectionName.php",
			findAuthor: "./user.php",
			checkPassword: "./checkPassword.php",
			addNewCollection: "./addCollection.php",
			updateCollection: "./updateCollection.php",
			//addNewObject: "./addObjectss.php",
			//updateObject: "./updateObject.php",
			deleteObject: "./deleteObject.php",
			addKmlLink: "./importKmlLink.php",
			addKmlFile: "./uploadKmlFile.php",
			updateKmlLink: "./updateKmlLink.php",
			uploadMediaFile: "./uploadhandler.php",
			uploadKmlFile: "./uploadKmlFile.php",
			// WebServices URLS
			addNewObject: "./provider/objects",
			updateObject: "./provider/objects/"
			// createNewObject: /provider/objects (POST)
			// deleteObject: /provider/objects/<id> (DELETE)
		},

        // Default HTML Template
		HTML = {
			panelHead: [
				'<form id="', IDS.metaForm, '">',
				'<div class="', CLASSES.closeBtn, '"></div>',
				'<h6>Please complete the following fields</h6>',
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.title, '">Title</label>',
					'<input type="text"',
					'id="', IDS.title, '" name="', IDS.title, '" />',
				'</div>',
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.author, '">Author</label>',
					'<input type="text"',
					'id="', IDS.author, '" name="', IDS.author, '" />',
				'</div>',
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.passcode, '">Password</label>',
					'<input type="password"',
					'id="', IDS.passcode, '" name="', IDS.passcode, '" />',
				'</div>',
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.timeString, '">Time</label>',
					'<input type="hidden" value="" ',
					'id="', IDS.timeString, '" name="', IDS.timeString, '">',
					'<div id="', IDS.time, '">',
						'<input type="text" id="', IDS.startTime, 
							'" name="', IDS.startTime, '" />',
						'<snap> to </snap>',
						'<input type="text" id="', IDS.endTime, 
							'" name="', IDS.endTime, '" />',
					'</div>',
				'</div>',
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.license, '">License</label>',
					'<div id="', IDS.license, '">',
					'<img src="images/by.png" title="CC By Attribution">',
					'<snap class="', CLASSES.changeLicense, '">Change</snap>',
					'<a class="', CLASSES.licenseHelp, 
					' ', CLASSES.blankLink ,'" ',
					'href="', URLS.licenseInfo, '"',
					'target="_blank" tabindex="-1">More Info</a>',
					'</div>',
				'</div>',
				'</form>',
				'<div class="', CLASSES.toolbar, '">',
					'<div class="', CLASSES.toolbarBtn, ' ', 
						CLASSES.contentBtn, '" title="Edit Description"></div>',
					'<div class="', CLASSES.toolbarBtn, ' ', CLASSES.baseMapBtn,
					'" title="Select Base Map"></div>',
					'<div class="', CLASSES.toolbarBtn, ' ', CLASSES.objectBtn,
					'" title="Select Other Items"></div>',
//					'<div class="', CLASSES.toolbarBtn, ' ', CLASSES.shareBtn,
//					'" title="Share with other user"></div>',
					'<div class="', CLASSES.toolbarBtn, ' ', 
						CLASSES.settingBtn, '" title="Advanced Setting"></div>',
					'<div class="', CLASSES.toolbarBtn, ' ', 
						CLASSES.privilegeBtn, '" title="Privilege Setting"></div>',
					'<div class="', CLASSES.toolbarBtn, ' ', 
						CLASSES.bookBtn, '" title="Add Book"></div>',
					//'<span class="', CLASSES.optionLink, '">Options</span> | ',
					//'<span class="', CLASSES.permaLink, '">Link</span>',
				'</div>',
				'<div class="', CLASSES.toolPanel, '">',
					'<div class="', CLASSES.closeBtn, '"></div>',
					'<div class="', CLASSES.toolPanelContent, '"></div>',
				'</div>'],
			deleteBtn: ['<div class="', CLASSES.toolbarBtn, ' ',
				CLASSES.deleteBtn, '" title="Delete this object"></div>'
			],
			panelFooter: [
				'<p>Belongs to</p>',
				'<div class="', CLASSES.collectionBox, '">My Collection',
				'</div>',
				'<div class="', CLASSES.collectionBtn, '"></div>',
				'<div class="', CLASSES.saveBtn, '">SAVE</div>'
			],
			collectionPanel: [
				'<div class="', CLASSES.newCollectionBtn, '">Create New',
				'<div class="', CLASSES.closeBtn, '"></div></div>',
				/* '<div class="', CLASSES.closeCollectionBtn, '">Close</div>', */
				'<div class="', CLASSES.closeCollectionBtn, '">Close</div>',
				'<div class="', CLASSES.myCollections, '"></div>',
				'<div class="', CLASSES.otherCollections, '"></div>',
				'<input type="text" class="', CLASSES.searchBox,
				'" id="', IDS.keyword, '" name="', IDS.keyword, '" />',
			],
			newCollectionPanel: [ '<div class="', CLASSES.newCollectionPanelContent, '">',
				"<h6>Add New Collection</h6>",
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.newName, '">Please enter a new collection name</label>',
					'<input type="text" value="" ',
					'id="', IDS.newName, '" name="', IDS.newName, '" />',
					'<input type="password" value="" ',
					'id="', IDS.newPwd, '" name="', IDS.newPwd, '" />',
				'</div>',
				'<div class="', CLASSES.feedbackBox, '"></div>',
				'<div class="', CLASSES.addBtn, '">OK</div>',
				'<div class="', CLASSES.cancelBtn, '">Cancel</div>',
				'</div>'
			],
			passwordPanel: [ '<div class="', CLASSES.passwordPanelContent, '">',
				"<h6>Password</h6>",
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.password, '">Please enter password:</label>',
					'<input type="password" value="" ',
					'id="', IDS.password, '" name="', IDS.password, '" />',
				'</div>',
				'<div class="', CLASSES.feedbackBox, '"></div>',
				'<div class="', CLASSES.sendPwdBtn, '">Submit</div>',
				'<div class="', CLASSES.cancelBtn, '">Cancel</div>',
				'</div>'
			],
			licensePanel: [
				'<div class="', CLASSES.licenseType, 
					'" id="', IDS.ccBY, '">',
					'<img src="images/by.png" title="CC By Attribution">',
					'Attribution',
				'</div>',
				'<div class="', CLASSES.licenseType, 
					'" id="', IDS.ccBYSA, '">',
					'<img src="images/by-sa.png" ',
					'title="By Attribution Share Alike">',
					'Attr. Share Alike',
				'</div>',
				'<div class="', CLASSES.licenseType, 
					'" id="', IDS.ccBYND, '">',
					'<img src="images/by-nd.png" ',
					'title="By Attribution No Derivatives">',
					'Attr. No Derivatives',
				'</div>',
				'<div class="', CLASSES.licenseType, 
					'" id="', IDS.ccBYNC, '">',
					'<img src="images/by-nc.png" ',
					'title="By Attribution Non-Commercial">',
					'Attr. Non-Commercial',
				'</div>',
				'<div class="', CLASSES.licenseType, 
					'" id="', IDS.ccBYNCSA, '">',
					'<img src="images/by-nc-sa.png" ',
					'title="By Attribution Non-Commercial Share Alike">',
					'Attr. N-C Share Alike',
				'</div>',
				'<div class="', CLASSES.licenseType, 
					'" id="', IDS.ccBYNCND, '">',
					'<img src="images/by-nc-nd.png" ',
					'title="By Attribution Non-Commercial No Derivatives">',
					'Attr. N-C No Derivatives',
				'</div>'
			],
			baseMapPanel: ['<div class="', CLASSES.baseMapPanel, '">',
				'<div class="', CLASSES.currentBaseMap, '"></div>',
				'<div class="', CLASSES.mapToolBox, '">',
					'<snap>Opacity</snap>',
					'<div class="', CLASSES.baseMapOC, '"></div>',
					'<div class="', CLASSES.removeBaseMap, '">Remove This Map</div>',
				'</div>',
				'<div class="', CLASSES.webServiceMap, '">',
					'<input type="text" value="" placeholder="Enter Map Url here..."',
					'id="', IDS.mapUrl, '" name="', IDS.mapUrl, '" />',
					'<div class="', CLASSES.addwsMap, '">+</div>',
				'</div>',
				'<div class="', CLASSES.baseMapList, '"></div>',
				'</div>'
			],
			mapItem: ['<div class="', CLASSES.mapItem, '">',
//				'<div class="', CLASSES.removeBaseMap, '"></div>',
				'<div class="', CLASSES.mapToolBtn, '"></div>',
//				'<input type="checkbox" class="', CLASSES.checkBox, '" />',
				'<strong></strong><span></span>',
				'</div>'
			],
			objectPanel: ['<div class="', CLASSES.objectPanel, '">',
				'</div>'
			],
			settingPanel: ['<div class="', CLASSES.settingPanel, '">',
				'<h6>This is the setting panel</h6>',
				'<br/>',
				'<div style="padding:10px">Icon of marker, line styles of Polyline (Polygon) and attributes of 3D object can be set here.</div>',
				'<form id="', IDS.settingForm, '">',
				'<input type="checkbox" id="', IDS.isHidden, '">is Hidden?',
				'</form>',
				'</div>'
			],
			bookPanel: ['<div class="', CLASSES.bookPanel, '">',
				'<h6>Search for a book</h6>',
				'<form id="', IDS.bookSearchForm, '">',
				'<input id="', IDS.bookSearchKey,
					'" name="', IDS.bookSearchKey, '">',
//				'<input type="checkbox" id="', IDS.isAPlace, '">This is a Place Name.',
				'</form>',
				'<div class="', CLASSES.currentBook, '"></div>',
				'<div class="', CLASSES.bookList, '"></div>',
				'</div>'
			],
			bookItem: ['<div class="', CLASSES.bookItem, '">',
//				'<div class="', CLASSES.removeBaseMap, '"></div>',
//				'<div class="', CLASSES.mapToolBtn, '"></div>',
//				'<input type="checkbox" class="', CLASSES.bookCheckBox, '" />',
				'<strong></strong><br/><span></span>',
				'</div>'
			],
			privilegePanel: ['<div class="', CLASSES.privilegePanel, '">',
				'<h6>This is the privilege panel</h6>',
				'<br/>',
				'<div style="padding:10px">Co-authors<br/>Please enter the email of the	author and press enter</div>',
				'<form id="', IDS.privilegeForm, '">',
				'E-mail:<input type="text" id="', IDS.coauthorEmail, '">',
        '<input type="submit" value="Search" id="', IDS.searchCoauthor,'"><br/>',
				'<div><input type="checkbox" id="', IDS.shareAll, '">',
				'Share all objects in this collection?</div>',
				'<div id="coauthors"></div>',
				'</form>',
				'</div>'
			],
			coauthorItem: ['<div class="', CLASSES.coauthorItem, '">',
				'<div class="', CLASSES.removeCoauthor, '"></div>',
				'<strong></strong><span></span>',
				'</div>'
			],
			desciptionEditor: ['<div class="', CLASSES.contentPanel, '">',
				'<form id="', IDS.contentForm, '">',
				'<textarea id="', IDS.description, '" rows="10">',
				'Type the description here.',
				'</textarea>',
				'</form>',
				'<div class="', CLASSES.block, '"></div>',
				'</div>'
			],
			htmlEditor: ['<div class="', CLASSES.contentPanel, '">',
				'<form id="', IDS.contentForm, '">',
				'<textarea id="', IDS.description, '" rows="10">',
				'Type the description here.<br/>',
				'Also, we support some <b>Basic</b> HTML tags.',
				'</textarea>',
				'</form>',
				'<div class="', CLASSES.mediaPanel, '">',
					'<div class="', CLASSES.mediaPanelContent, '"></div>',
				'</div>',
				'<div class="', CLASSES.block, '"></div>',
				'<iframe id="', IDS.uploadTarget, '" name="', IDS.uploadTarget, 
					'" src="javascript:void(0)"></iframe>',
				'</div>'
			],
			kmlEditor: ['<div class="', CLASSES.contentPanel, '">',
				'<form id="', IDS.contentForm, '" ',
				'action="', URLS.uploadKmlFile, '" ',
				'method="post" enctype="multipart/form-data" ',
				'target="', IDS.uploadTarget, '">',
				'<h6>Please type in a KML URL</h6>',
				'<a class="', CLASSES.kmlHelp, 
					' ', CLASSES.blankLink ,'" ',
					'href="', URLS.kmlHelp, '"',
					'target="_blank" tabindex="-1">Need help?</a>',
				'<input type="hidden" value="" ',
				'id="', IDS.metaData, '" name="', IDS.metaData, '">',
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.kmlLink, '">KML URL</label>',
					'<input type="text" value="" ',
					'id="', IDS.kmlLink, '" name="', IDS.kmlLink, '" />',
				'</div>',
				'<div class="', CLASSES.previewBtn, '">Preview KML on map</div>',
				'<h6>Or select a KML file to upload</h6>',
				'<input type="hidden" value="" ',
				'id="', IDS.command, '" name="', IDS.command, '">',
				'<div class="', CLASSES.formItem, '">',
					'<div class="', CLASSES.uploadKmlBtn, '">Upload File</div>',
					'<label for="', IDS.kmlFile, '">KML File</label>',
					'<input type="file" ',
					'id="', IDS.kmlFile, '" name="', IDS.kmlFile, '" />',
				'</div>',
				'<div class="', CLASSES.block, '"></div>',
				'<iframe id="', IDS.uploadTarget, '" name="', IDS.uploadTarget, 
					'" src="javascript:void(0)"></iframe>',
				'<div class="', CLASSES.feedbackBox, '"></div>',
				'</form>',
				'</div>'
			],
			imageUploader: [
				'<form id="', IDS.mediaForm, '" ',
				'action="', URLS.uploadMediaFile, '" ',
				'method="post" enctype="multipart/form-data" ',
				'target="', IDS.uploadTarget, '">',
				'<input type="hidden" value="image" ',
				'id="', IDS.mediaType, '" name="', IDS.mediaType, '">',
				'<h6>Insert Image</h6>',
				'<a class="', CLASSES.imageHelp,
					' ', CLASSES.blankLink ,'" ',
					'href="', URLS.freeHosting, '"',
					'target="_blank" tabindex="-1">Need image hosting?</a>',
				'<div class="', CLASSES.formItem, '">',
					'<label for="', IDS.mediaLink, '">Image URL</label>',
					'<input type="text" value="" ',
					'id="', IDS.mediaLink, '" name="', IDS.mediaLink, '" />',
				'</div>',
				'<div class="', CLASSES.insertBtn, '">Insert Image</div>',
				'<div class="', CLASSES.cancelBtn, '">Cancel</div>',
				'<h6>Or select an image file to upload</h6>',
				'<div class="', CLASSES.formItem, '">',
					'<div class="', CLASSES.uploadMediaBtn, '">Upload Image</div>',
					'<label for="', IDS.mediaFile, '">Media File</label>',
					'<input type="file" ',
					'id="', IDS.mediaFile, '" name="', IDS.mediaFile, '" />',
				'</div>',
				'<div class="', CLASSES.feedbackBox, '"></div>',
				'</form>'
			],
			collectionItem: ['<div class="', CLASSES.collectionItem, '">',
				'<input type="checkbox" class="', CLASSES.checkBox, '" />',
				'</div>'
			],
			previewItem: ['<div class="', CLASSES.previewItem, '">',
				'<snap class="', CLASSES.previewFilename, '"></snap>',
				'<snap class="', CLASSES.previewFileTool, '">',
				'[ <snap class="', CLASSES.previewFile, '" ',
				'title="Preview your KML file on map">Preview</snap> ]',
				'[ <snap class="', CLASSES.removeFile, '" ',
				'title="Remove this file and upload a new one">Delete</snap> ]',
				'</snap>',
				'</div>'
			],
			loading: ['<div class="', CLASSES.collectionPrompt, '">Loading...</div>'],
			wrongExt: ['<Error><Message>',
				'Error: Invalid file extension.',
				'</Message></Error>'],
			searching: ['<div class="', CLASSES.collectionPrompt, '">Searching...</div>'],
			titlePrompt: "Type the name of the object here.",
			newNamePrompt: "Type a new collection name here.",
			newPwdPrompt: "Type a password here.",
			imgLinkPrompt: "Paste link here. e.g. http://p.com/photo.jpg",
			kmlLinkPrompt: "Paste link here. e.g. http://m.com/route.kml",
			noResult: ['<div class="', CLASSES.collectionPrompt, '">No Results</div>'],
			noTitle: "Please specify a title for the object.",
			noImgLink: "Please provide the image url first.",
			noKmlLink: "Please provide the kml link first.",
			noFileUrl: "Please upload the kml file irst.",
			noNewName: "No name specified. Please provide the new collection name.",
			noPassword: "No pasword specified. Please provide the password.",
			noParent: "Please check at least one collection that this object should belong to.",
			notPreviewed: ["It's a good idea to preview your link before saving it. \n",
				"Press OK to preview your link or press Cancel to save it anyway."],
			successAddNew: ["New collection created successfully.\n",
				"Please note this collection will not show up in the collection list\n",
				"until a new object is added to it."],
			failAddNew: "Oops, fail to create your new collection.",
			failLoadKml: ["Sorry, we currently have a problem loading your KML file. \n",
				"Please check if it is a valid URL, and also a valid KML file."],
			no3DBound: ["Sorry, we cannot determine the boundaries of this KML file.\n",
				"Please check if it works in Google Earth.\n",
				"Also check if it contains network link. We do not support network link	for now.\n",
				"Or you can try to add this KML file in traditional map mode."],
			no2DBound: ["Sorry, the boundaries of this KML file extends fully around ",
				"the earth.\nIn most case, this might be an KML file contains 3D ",
				"elements.\nPlease limit the boundaries of your KML file in a ",
				"smaller area.\nOr you can try to add this KML file in Earth mode."],
			uploading: "Uploading file ",
			delMessage: "Are you sure you want to delete this object",
			saveMessage: "Are you sure you want to leave without saving your changes?",
			promptPassword: ['<div>Please enter password:', 
				'<input type="password" id="password">',
				'<input type="button" value="Submit" id="submit">',
				'</div>'],
			wrongPassword: "Password incorrect!",
			unauthObjWarn: ['The current user does not have privilege to update object ',
				'.\nPlease remove the ID in <Placemark> tag to create new objects,',
				'or remove those placemarks.']
		};

	// Private functions

	/**
	 * Create Dom node of object edit panel
	 * then initialize metedata form 
	 */
	var _createPanelDom = function () {

		var panelDom           = $(document.createElement("div")),
			panelHead          = $(document.createElement("div")),
			panelBody          = $(document.createElement("div")),
			panelFooter        = $(document.createElement("div")),
			licensePanel       = $(document.createElement("div")),
			collectionPanel    = $(document.createElement("div")),
			newCollectionPanel = $(document.createElement("div")),
			passwordPanel      = $(document.createElement("div")),
			panelWidth         = _panelWrapper.width(),
			panelHeight        = _panelWrapper.height(),
			collectionDiv      = null,
			mainPanel          = [],
			pickerOption       = {spinnerImage: "", dateFormat: "ymd-"},
			params             = {func: "u"};

		// Create dom node for license selection panel
		licensePanel.addClass(CLASSES.licensePanel)
			.html(HTML.licensePanel.join(''))
			.children(":first")
			.addClass(CLASSES.selected)
			.end()
			.bind({
				"mouseleave": _hideLicensePanel,
				"mouseenter": _showLicensePanel
				}
			);

		// Create dom node for collection select panel
		collectionPanel.addClass(CLASSES.collectionPanel)
			.html(HTML.collectionPanel.join(''))
			.find("." + CLASSES.searchBox)
				.keyup(_searchHandler);

		newCollectionPanel.addClass(CLASSES.newCollectionPanel)
			.html(HTML.newCollectionPanel.join(''))
			.find("#" + IDS.newName)
				.form_prompt(HTML.newNamePrompt);
		newCollectionPanel
			.find("#" + IDS.newPwd)
				.form_prompt(HTML.newPwdPrompt);
			
		passwordPanel.addClass(CLASSES.passwordPanel)
			.html(HTML.passwordPanel.join(''))
			.find("#" + IDS.password)
				.form_prompt(HTML.newPwdPrompt);

		// Create dom node for collection info (metadata)
		panelHead.attr("id", IDS.panelHead)
			.addClass(CLASSES.panelHead)
			.html(HTML.panelHead.join(''))
			.find("#" + IDS.title)
				.form_prompt(HTML.titlePrompt)
				.end()
			.find("#" + IDS.license)
			.parent()
			.after(licensePanel);

		// Determin which main panel to load
		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.PLACEMARK ||
			_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
			mainPanel = HTML.htmlEditor;
		} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK ||
			_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK) {
			mainPanel = HTML.kmlEditor;
		} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.FOLDER) {
			mainPanel = HTML.desciptionEditor;
		}

		// change the content button tooltip for 3D objects
		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK) {
			$("." + CLASSES.contentBtn, panelHead).attr("title", "Edit URL");
		}

		// Create dom node for collection editor container
		panelBody.attr("id", IDS.panelBody)
			.addClass(CLASSES.panelBody)
			.html(mainPanel.join(''))
			.append(HTML.baseMapPanel.join(''))
			.append(HTML.objectPanel.join(''))
			.append(HTML.settingPanel.join(''))
			.append(HTML.bookPanel.join(''))
			.append(HTML.privilegePanel.join(''))
			.find("#" + IDS.privilegeForm)
				.submit(function(){
						_findAuthor();
						return false;
						});
		// hide shareAll checkbox by default
		panelBody.find("#" + IDS.shareAll).parent().hide();

		// Create dom node for panel footer 
		panelFooter.attr("id", IDS.panelFooter)
			.addClass(CLASSES.panelFooter)
			.html(HTML.panelFooter.join(''))
			.prepend(collectionPanel)
			.prepend(newCollectionPanel)
			.prepend(passwordPanel);

		// Create main panel dom and bink click event handler
		panelDom.attr("id", IDS.objectEditPanel)
			.addClass(CLASSES.objectEditPanel)
			.width(panelWidth - 10)
			.height(panelHeight)
			.append(panelHead)
			.append(panelBody)
			.append(panelFooter)
			.click(_panelClickHandler)
			.appendTo(_panelWrapper);

		// Assign default author
		$("#" + IDS.author, panelHead).val(HyperCities.user.getNickname());

		// Hide password field, only show it for collections
		$("#" + IDS.passcode, panelHead).parent().hide();

		// Setup default timespan
		pickerOption.beforeShow = _checkDateRange;
		_timespan = {min: Date.today(), max: Date.today()};
		_timespan.min.setFullYear(1);

		$("#" + IDS.startTime, panelHead)
			.dateEntry(pickerOption)
			.dateEntry('setDate', _timespan.min);
		$("#" + IDS.endTime, panelHead)
			.dateEntry(pickerOption)
			.dateEntry('setDate', _timespan.max);
    
    // adjust timebar
    HyperCities.control.timeSlider.setTime(null, _timespan.min, _timespan.max, false, false);

		// Load user's collection
		collectionDiv = $("." + CLASSES.myCollections, panelFooter);
		collectionDiv.html(HTML.loading.join(''));

		$.get(URLS.getCollectionName, params,
			function ($data) {
				_parseCollectionName($data, collectionDiv, true);
			}, 
			"json"
		);

	};

	/**
	 * Create Dom for collection Item
	 * @param {Object} Item information
	 * @return {DOM}
	 */
	var _createItemDom = function ($item, $checked) {

		var itemDom = $(HTML.collectionItem.join('')),
			checked = ($checked === true);

			itemDom.data("id", $item.id)
				.data("owner", $item.owner)
				.append($item.title)
				.attr("title", itemDom.text())
				.find("input:checkbox")
					.click(_toggleCollectionItem)
					.attr("name", "collection_" + $item.id)
					.attr('checked', checked);

		return itemDom;
	};

	/**
	 * Setup the objectEditPanel DOM variables and CSS style
	 */
	var _init = function () {

		// calculate default panel width
		var panelWidth = parseInt($(window).width()/3.0),
			sidebarDiv = $("#" + IDS.sidebarWrapper);

		// Initialize private variables
		_baseMap      = HyperCities.session.get("baseMap");
		_isSaved      = false;
		_sidebarWidth = sidebarDiv.width();
		_timespan     = HyperCities.control.timeSlider.getTime();

		// Setup session Mode Variable
		_originalMode = HyperCities.session.get("mode");
		HyperCities.session.set("mode", _currentMode);

		// Get Dom Elements
		_panelWrapper = $("#" + IDS.panelWrapper, sidebarDiv);

		// Apply default width to objectEditPanel
		_panelWrapper.width(panelWidth);

		// Change sidebar width
		sidebarDiv.width(panelWidth);

		// Change sidebar color scheme
		HyperCities.util.setSidebarStyle(_currentMode);

		// Setup Listeners in MODE_ADD_OBJECT/MODE_EDIT_OBJECT
//		_addListeners();

		_initialized = true;

		HyperCities.adjustLayout({sync: false});
	};

	/**
	 * Hide the objectEditPanel DOM and reset private variables
	 */
	var _reset = function () {

		var sidebarDiv = $("#" + IDS.sidebarWrapper);

		// If there exist old overlay, remove it
		if (_kmlPreview !== null) {
			_removeKml();
		}

		// Remove Listeners in MODE_ADD_OBJECT/MODE_EDIT_OBJECT
//		_removeListeners();

		// Clean up variables
		_baseMap         = null;
		_bookmarks       = null;
		_isSaved         = false;
		_timespan        = null;
		_objectType      = null;
		_markerType      = null;
		_currentParentId = null;

		// Enable auto map refresh
		HyperCities.earth.enableSync(true);

		// Clean up objectEditPanel and Hide Panel
		_panelWrapper
			.fadeOut()
			.empty()
			.width(_sidebarWidth);

		$("#bookViewer").hide();

		// Restore sidebar width
		sidebarDiv.width(_sidebarWidth);

		// Restore sidebar color scheme
		HyperCities.util.setSidebarStyle(_originalMode);

		// Restore Session Mode Variable
		HyperCities.session.set("mode", _originalMode);

		_initialized = false;

		
		// no need to adjust layout if we go back to narrative mode
		if ( _originalMode !== HyperCities.config.MODE_NARRATIVE ) {
			HyperCities.adjustLayout({sync: false});
		}
	};

	/**
	 * Date range check function for jDateEntry Plugin
	 * Check two date fields, each restricting the other.
	 * @param {Dom} dataEntry fields
	 * @return {Object} bounds of date range
	 */
	var _checkDateRange = function ($input) {

		var minValue = null,
			maxValue = null,
			bounds   = {};

		if ($input.id == IDS.endTime) {
			minValue = $("#" + IDS.startTime).dateEntry('getDate');
		}
		if ($input.id == IDS.startTime ) {
			maxValue = $("#" + IDS.endTime).dateEntry('getDate');
		}

		bounds = {minDate: minValue, maxDate: maxValue};

		return bounds;
	};

	/**
	 * Event delegation handler to process all click event on panel
	 * @param {Event} $event
	 * @return {Boolean} return false to prevent event propagation
	 *                   return true to propagate the click event
	 */
	var _panelClickHandler = function ($event) {

		var target = $($event.target);

		if (target.hasClass(CLASSES.blankLink) || target.is(":checkbox")) { 
			// Bypass the URL click event that open to new windows/tabs
			// Also, blur the checkbox event
			target.blur();
			return true;

		} else if (target.is(":input")) {
			// Bypass click on other type of input filed
			return true;

		} else if (target.hasClass(CLASSES.closeBtn)) { 
			// user click on Close Button (could be Main Panel or ToolbarPanel)
			_closeBtnClickHandler($event);

		} else if (target.hasClass(CLASSES.collectionBtn)) {
			// user click on Collection Selection Box
			_toggleCollectionPanel();

		} else if (target.hasClass(CLASSES.newCollectionBtn)) {
			// user click on Collection Selection Box
			_showNewCollectionPanel();

		} else if (target.hasClass(CLASSES.closeCollectionBtn)) {
			// user click on Collection Selection Box
			_closeCollectionPanel();
		} else if (target.hasClass(CLASSES.collectionItem)) {
			// user click on Change Licence Link
			_toggleCollectionItem($event);

		} else if (target.hasClass(CLASSES.changeLicense)) {
			// user click on Change Licence Link
			_showLicensePanel();

		} else if (target.hasClass(CLASSES.licenseType)) { 
			// user select a license type text in LicensePanel
			_selectLicense(target);

		} else if (target.parent().hasClass(CLASSES.licenseType)) { 
			// user select a license type image in LicensePanel
			_selectLicense(target.parent());

		} else if (target.hasClass(CLASSES.saveBtn)) {
			// user click on save Button
			_saveBtnClickHandler($event);

		} else if (target.hasClass(CLASSES.contentBtn)) {
			// user click on Edit Description Button
			_switchPanel(CLASSES.contentPanel);

		} else if (target.hasClass(CLASSES.settingBtn)) {
			// user click on Advanced Setting Button
			_switchPanel(CLASSES.settingPanel);

		} else if (target.hasClass(CLASSES.privilegeBtn)) {
			// user click on Advanced Setting Button
			_switchPanel(CLASSES.privilegePanel);
		} else if (target.hasClass(CLASSES.bookBtn)) {
			// user click on Advanced Setting Button
			_switchPanel(CLASSES.bookPanel, _initBookSearch);
		} else if (target.hasClass(CLASSES.baseMapBtn)) {
			// user click on BaseMap Button
			_switchPanel(CLASSES.baseMapPanel, _getBaseMapList);

		} else if (target.hasClass(CLASSES.objectBtn)) {
			// user click on object selection Button
			_switchPanel(CLASSES.objectPanel, _getObjectList);

		} else if (target.hasClass(CLASSES.insertBtn)) {
			// user click on Insert Image button (in addMedia Panel)
			_insertImage();

		} else if (target.hasClass(CLASSES.sendPwdBtn)) {
			// user click on Add New Collection
			_checkPwdCollection();

		} else if (target.hasClass(CLASSES.addBtn)) {
			// user click on Add New Collection
			_addNewCollection();

		} else if (target.hasClass(CLASSES.cancelBtn)) {
			// user click on Cancel button
			_cancelBtnClickHandler($event);

		} else if (target.hasClass(CLASSES.previewBtn)) {
			// user click on Preview Kml button
			_toggleKmlLinkPreview();

		} else if (target.hasClass(CLASSES.previewFile)) {
			// user click on Preview KML file link
			_toggleKmlFilePreview();

		} else if (target.hasClass(CLASSES.removeFile)) {
			// user click on remove KML file link
			_resetKmlUploader();

		} else if (target.hasClass(CLASSES.deleteBtn)) {
			// user click on Delete Item Button
			_deleteObject();

		} else if (target.hasClass(CLASSES.mapToolBtn)) {
			_toggleMapToolPanel($event);

		} else if (target.hasClass(CLASSES.removeBaseMap)) {
			_removeBaseMap($event);

		} else if (target.hasClass(CLASSES.addwsMap)) {
			_addwsMap();

		} else {
			HyperCities.util.debug(_id + "[A3] Click Object Edit Panel");
			HyperCities.util.debug(target);
		}

		return false;
	};

	var _initBookSearch = function () {

		$("#" + IDS.bookSearchForm).submit( function () {
				var key = $("#" + IDS.bookSearchKey).val();
				if ( key.length > 0 ) {
					$.get("./bookSearch.php", {keyword: key}, _parseBookSearchResults, "json");
				}
				return false;
			});

		// Load books if in editing mode
		$("." + CLASSES.currentBook, _panelWrapper).empty();
		if (_bookmarks) {
			$.each(_bookmarks,
				function() {
					_addBook(this.bookId, this.bookTitle, null, this.bookCover, this.pageNo, false);
				}
			);
		}
	};

	var _parseBookSearchResults = function ($data) {

		var books          = $data.results,
			book          = {},
			bookId        = null,
			len           = books.length,
			bookDom = $("." + CLASSES.bookList, _panelWrapper),
			itemDom       = null,
			listDom       = $("<div/>");

		if (!len) { // Query returns no books
			bookDom.empty().append("No Book ");
			return;
		} else {
			bookDom.empty();
		}

		while (len--) {
			book = books[len];
			bookId = book.id.split("/").reverse()[0];

			//itemDom = $('<div>'+maps[len].title+'</div>');
			itemDom = $(HTML.bookItem.join(''));
			itemDom
				.data("id", bookId)
				.data("title", book.title)
				.data("thumbnail", book.thumbnail)
				.attr("id", "bookItem_" + bookId)
				.find("strong")
					.html(book.title)
					.attr("title", book.title)
					.end()
				.find("span")
					.html("by " + book.author.join(", "))
					.end()
				.click(_toggleBookViewer);

			listDom.append(itemDom);
		}

		bookDom.append(listDom.children());

		return false;
	};

	// Should Move to map.js with overlayBookViewer();

	var _toggleBookViewer = function () {
		var bookId = $(this).data("id"),
				bookTitle = $(this).data("title"),
				bookCover = $(this).data("thumbnail"),
				keyword = $("#" + IDS.bookSearchKey).val();

		//alert("View Book " + bookId);
		_addBook(bookId, bookTitle, keyword, bookCover, null, true);
	};

	var _removeBook = function ($bookId) {

		HyperCities.util.debug(_id + "Remove Book " + $bookId);
		HyperCities.mainMap.closeBookViewer($bookId);
		var currentBookDom = $("." + CLASSES.currentBook, _panelWrapper),
				currentBooks = null;

		currentBookDom.find("#" + $bookId).remove();

		currentBooks = currentBookDom.children();
		if (currentBooks.length == 0) {
			currentBookDom.height(0);
		}
	};

	var _addBook = function ($bookId, $bookTitle, $keyword, $bookCover, $pageNo, $openViewer) {

		var target = $("#bookItem_" + $bookId),
			currentBookDom = $("." + CLASSES.currentBook, _panelWrapper),
			seqence      = (currentBookDom.children()).length + 1,
			bookUid      = "",
			pageNo       = $pageNo || null,
			bookCover    = $bookCover || "",
			bookTitle    = $bookTitle || "",
			currentBooks = null,
			removedBook  = null,
			openViewer   = $openViewer || false,
			itemDom      = null;

		// HyperCities.util.debug(_id + "Select Book" + $bookId);

		// target.fadeOut();

		// Add it to Currrent BookList
		bookUid = "CB_" + seqence + "_" + $bookId;
		itemDom = $('<div class="' + CLASSES.bookCover + '" id="' + bookUid +'"></div>');
		itemDom.data("Id", bookUid)
			.data("thumbnail", bookCover)
			.data("bookTitle", bookTitle)
			.data("pageNo", pageNo);

		itemDom.append('<img src="' + bookCover + '" title="' + bookTitle + '"><div class="closeBtn"></div><div class="pageNum"></div>')
		itemDom.mouseenter(
				function(event){
					$(this).find(".closeBtn").show();
				})
				.mouseleave(
				function(event){
					$(this).find(".closeBtn").hide();
				}
			);
		itemDom.find("img").click(
				function(event) {
					var pageNo = $(this).parent().data("pageNo");
					HyperCities.mainMap.overlayBookViewer(bookUid, bookTitle, $keyword, pageNo);
				}
			);

		if (pageNo) {
			itemDom.find(".pageNum")
				.html("p." + pageNo);
		}

		currentBookDom.prepend(itemDom);
		currentBooks = currentBookDom.children();
		// Adjust the height of current book panel
		if (currentBooks.length > 0) {
			currentBookDom.height(100);
		} else {
			currentBookDom.height(0);
		}

		if (openViewer) {
			HyperCities.mainMap.overlayBookViewer(bookUid, $bookTitle, $keyword);
		}
	};

	/**
	 *  Add a web service map to the current object
	 */
	var _addwsMap = function () {
			var mapUrl = $("#HCMapUrl").val(),
					mapHash = null;
	
			// if no url, don't do anything
			if (mapUrl.length == 0) { return; }

			// if user has not entered http:// https:// 
			// assume they mean http:// and update the form element
			if(!/^(https?):\/\//i.test(mapUrl)) {
				mapUrl = 'http://'+mapUrl;
				$("#HCMapUrl").val(mapUrl);
			}

			var re = new RegExp("^(.*)\/([0-9|,]+)$");
			var layer = 0;
			var result = [];
			if (re.test(mapUrl)) {
				result = re.exec(mapUrl);
				mapUrl = result[1];
				layer = result[2].split(",");
			}
			var opacity = 1.0;
			var mapData = {};
			var currentMapDom = $("." + CLASSES.currentBaseMap, _panelWrapper);

            var mapType = "ArcGIS";
            if (mapUrl.match(/m_bbox/) || mapUrl.match(/wms/i)) {
                mapType = "WMS";
            }

			HyperCities.mainMap.addMapByUrl(mapUrl, mapType, opacity, mapData, layer)
			mapHash = HyperCities.util.MD5(mapUrl);

			// Add it to Currrent BaseMap
			itemDom = $(HTML.mapItem.join(''));
			itemDom
				.data("id", -1)
				.data("layer", layer)
				.data("mapUrl", mapUrl)
				.attr("id", "baseMapItem_ws_" + mapHash)
				.find("strong")
					.html("WS Map")
					.end()
				.find("span")
					.html(mapUrl)
					.attr("title", mapUrl)
				.end();
			currentMapDom.prepend(itemDom);
			currentMaps = currentMapDom.children();
					/*
					if (currentMaps.length > 2) {
						removedMap = currentMapDom.children(":last");
						HyperCities.util.debug(_id + "Remove Map " + removedMap.data("id"));
						HyperCities.mapList.hideMap(removedMap.data("id"));
						$("." + CLASSES.baseMapList, _panelWrapper)
							.find("#baseMapItem_" + removedMap.data("id"))
							.show();
						removedMap.remove();
					}
					*/
//				}
//	});
	};

	/**
	 *  Parse the result return from addCollection.php
	 *  @param {XML} the data returned from the server
	 */
	var _parseNewCollection = function ($response) {

		var success    = $($response).find("Success > Message").text(),
			error      = $($response).find("Error > Message").text(),
			panelDiv   = $("." + CLASSES.newCollectionPanel, _panelWrapper),
			textDiv    = $("." + CLASSES.feedbackBox, panelDiv),
			targetDiv  = $("." + CLASSES.myCollections, _panelWrapper),
			indexDiv   = targetDiv.children(":first"),
			upperTitle = "",
			isInserted = false,
			collection = {},
			itemDom    = null;

		// Enable the Button
		$("." + CLASSES.addBtn, panelDiv)
			.removeClass(CLASSES.disabled);

		if (success.length > 0) { // Action Success

			collection = window["eval"]("(" + success + ")");

			// Prepare New collection Div and check it 
			itemDom = _createItemDom(collection, true);

			// Insert it to the right place (in correct order)
			upperTitle = collection.title.toUpperCase();
			while (!isInserted && indexDiv.hasClass(CLASSES.collectionItem)) {
				if (indexDiv.attr("title").toUpperCase() < upperTitle) {
					indexDiv = indexDiv.next();
				} else {
					indexDiv.before(itemDom);
					isInserted = true;
				}
			}
			if (!isInserted) { // It is the last item
				targetDiv.append(itemDom);
			}

			alert(HTML.successAddNew.join(''));
			_hideNewCollectionPanel();
		} else if (error.length > 0) { // Action Fail
			textDiv.empty()
				.addClass(CLASSES.error)
				.html(HTML.failAddNew);
			alert(error);
		}

	};

	/** 
	 *  Parse the result return from queryCollectionName.php
	 *  @param {Array} Array that contain collection info
	 *  @param {Dom} Dom element's that the result will append to
	 *  @param {Boolean} whether to hide $targetDom when no result in $data
	 */
	var _parseCollectionName = function ($data, $targetDom, $hideIfNoResult) {

		var collections   = ($data.collections).reverse(),
			hide          = false,
			len           = collections.length,
			parentsList   = [],
			parentIndex   = -1,
			parentsIdList = [],
			itemDom       = null,
			listDom       = $("<div/>");

		if ($hideIfNoResult === true) {
			hide = true;
		}

		if (!len) { // Query returns no collection
			if (hide) { 
				$targetDom.empty().hide();
			} else {
				$targetDom.empty().append(HTML.noResult.join(''));
			}
			return;
		}

		$targetDom.empty();

		// If we are editing, prepare the parent information
		if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {

			parentsList = _objectData.parents;

			parentsIdList = $.map(parentsList,
				function ($node) {
					return $node.id;
				}
			);
		}

		while (len--) {

			// Create each individual item
			itemDom = _createItemDom(collections[len], false);

			var collectionId = collections[len].id,
				state = collections[len].state,
				hasPwd = collections[len].hasPwd,
				checkbox = itemDom.find("input:checkbox");

			// When creating new object, check My Collection by default
			if ((_currentMode === HyperCities.config.MODE_ADD_OBJECT) &&
				(collections[len].id === HyperCities.config.HC_COLLECTIONS.USER.id)) {
				itemDom.find("input:checkbox").attr('checked', true);
			} else if ((_currentMode === HyperCities.config.MODE_EDIT_OBJECT)) {
				parentIndex = $.inArray(collections[len].id, parentsIdList);
				if (parentIndex >= 0) {
					itemDom.find("input:checkbox").attr('checked', true);
					parentsIdList.splice(parentIndex, 1);
				}
			}

			if ((_originalMode === HyperCities.config.MODE_NARRATIVE) &&
				(collections[len].id === HyperCities.session.get("currentCollectionId"))) {
				//itemDom.find("input:checkbox").attr('checked', true);
			}

			// add password checking function if object is protected and has password
			if (state === HyperCities.config.HC_OBJECT_STATE.PROTECTED && hasPwd) {
				checkbox.bind('click', {id: collectionId}, function($event) {
					if ($.inArray(parseInt($event.data.id),
							HyperCities.session.get("authedCollection")) >= 0 ) {
						return true;
					}
					if ($(this).attr('checked')) {
						$event.preventDefault();
						$event.stopPropagation();
						_showPasswordPanel($event.data.id);
					}
				});
			}

			listDom.append(itemDom);
		}

		// Append Other parent collection's in parentsIdList
		if ($targetDom.hasClass(CLASSES.myCollections)) {
			len = parentsList.length;
			while (len--) {
				// Create item, if it's not yet inserted
				parentIndex = $.inArray(parentsList[len].id, parentsIdList);

				if (parentIndex >= 0) {
					itemDom = _createItemDom(parentsList[len], true);
					listDom.append(itemDom);
					parentsIdList.splice(parentIndex, 1);
				}
			}
		}

		$targetDom.append(listDom.children());
	};

	/**
	 * Find author by checking email
	 */
	var _findAuthor = function() {
		
		var email   = $.trim( $("#" + IDS.coauthorEmail).val() ),
			params  = {command: "findAuthor", email: email};

		// Trigger AJAX request
		$.post(URLS.findAuthor, params,
			function ($response) {
				if ($response.error) {
					alert($response.message);
				} else {

					// check if the author has been added
					if ( $("#user_" + $response.id, _panelWrapper).length > 0) {
						alert("The author has been added.");
						return;
					}

					var itemDom = $(HTML.coauthorItem.join(''));

					itemDom
						.data("id", $response.id)
						.attr("id", "user_" + $response.id)
						.find("strong")
							.html($response.first_name + " " + $response.last_name)
							.end()
						.find("span")
							.html(email)
							.end()
						.click(function() {
								$(this).remove();
							});

					$("#coauthors").append(itemDom);
				}
			},
			"json"
		);
	};

	/**
	 * SearchBox Handler, if there's keyword entered, search the keyword,
	 * otherwise, clear previous search results
	 */
	var _searchHandler = function () {

		var keyword     = this.value,
			panelFooter = null;

		clearTimeout(_outTimeout);

		if (keyword.length > 0) { // Trigger search if no further input
			_outTimeout = setTimeout(
				function () {
					_searchKeyword(keyword);
				}, 
				250
			);
		} else { // Clear previous search result
			panelFooter = $("#" + IDS.panelFooter, _panelWrapper);

			// move checked item to myCollections Area
			$("." + CLASSES.otherCollections + " input:checked", panelFooter)
				.each(function () {
					var itemDom    = $(this).parent(),
						collection = null;
						
						collection = {
							id: itemDom.data("id"),
							title: itemDom.attr("title"),
							owner: itemDom.data("owner")
						};
						itemDom = _createItemDom(collection, true);

						$("." + CLASSES.myCollections, panelFooter)
							.append(itemDom);
					}
				);

			// Clean up the otherCollections Area
			$("." + CLASSES.otherCollections, panelFooter)
				.empty()
				.hide();

			$("." + CLASSES.myCollections, panelFooter)
				.height("160px");
		}
	};

	/**
	 * Search the collection Name by keyword 
	 * @param {String} Keyword to seartch
	 */
	var _searchKeyword = function ($keyword) {

		var params        = {func: "k", key: $keyword},
			collectionDiv = $("#" + IDS.panelFooter + " ." + CLASSES.otherCollections);

		$("#" + IDS.panelFooter + " ." + CLASSES.myCollections).height("80px");
		collectionDiv.html(HTML.searching.join('')).show();

		// Trigger AJAX request
		$.get(URLS.getCollectionName, params,
			function ($data) {
				_parseCollectionName($data, collectionDiv, false);
			},
			"json"
		);
	};

	/**
	 * Toggle collection selection panel
	 * If the panel already shown, then hide the panel
	 */
	var _toggleCollectionPanel = function () {

		var footerDom   = $("#" + IDS.panelFooter),
			panelDom    = $("." + CLASSES.collectionPanel, footerDom),
			boxDom      = $("." + CLASSES.collectionBox, footerDom),
			searchBox   = $("." + CLASSES.searchBox, panelDom),
			otherArea   = $("." + CLASSES.otherCollections, panelDom),
			panelHeight = 0;

		if (panelDom.is(":hidden")) {
			panelDom
			//	.width(boxDom.outerWidth() - 2)
				.show();

			searchBox
				.width(boxDom.outerWidth() - 27)
				.focus();

			$("." + CLASSES.collectionBtn, footerDom)
				.addClass(CLASSES.close);

			// Adjust the collection selection panel height
			panelHeight = searchBox.outerHeight() + 6
						+ $("." + CLASSES.myCollections, panelDom).outerHeight()
						+ $("." + CLASSES.newCollectionBtn, panelDom).outerHeight();

			if (otherArea.is(":visible")) {
				panelHeight += otherArea.outerHeight();
			}

			panelDom
				.height(panelHeight);

		} else {
			panelDom.hide();

			$("." + CLASSES.collectionBtn, footerDom)
				.removeClass(CLASSES.close);
		}
	};
	/**
	 * Toggle the collectionItem
	 */
	var _toggleCollectionItem = function ($event) {

		var target      = $($event.target),
			checkBoxDom = null,
			inMyPanel   = false,
			currentUser = HyperCities.user.getUserId(),
			itemDom     = null;

		if (target.hasClass(CLASSES.checkBox)) { // Click on CheckBox
			checkBoxDom = target;
			itemDom = checkBoxDom.parent();
		} else { // Click on Item Name
			checkBoxDom = target.children("input:checkbox");
			itemDom = checkBoxDom.parent();

			// Manually toggle the checkBox
			/*
			if (checkBoxDom.attr('checked')) {
				checkBoxDom.attr('checked', false);
			} else {
				checkBoxDom.attr('checked', true);
			}
			checkBoxDom.trigger('click', {id: itemDom.data('id')});
			*/
		}

		if (itemDom.parent().hasClass(CLASSES.myCollections)) {
			inMyPanel = true;
		}

		if (itemDom.data("owner") !== currentUser) {
			if (inMyPanel && !checkBoxDom.attr('checked')) {
				// Remove it from My Panel
				itemDom.remove();
			}
		}
	};

	/**
	 * Switch the current panel to $targetPanel Div
	 * @param {Dom} the target panel to replace the current panel
	 * @param {function} callback that call after targetPanel is shown
	 */
	var _switchPanel = function ($targetPanel, $callback) {
		var panelDom   = $("#" + IDS.panelBody);
			fromDom    = panelDom.children(":visible"),
			toDom      = $("." + $targetPanel, panelDom),
			panelWidth = panelDom.width();

		if (toDom.is(":hidden")) {
			fromDom.fadeOut('fast');

			if (toDom.hasClass(CLASSES.objectPanel)) {
				toDom.parent().fadeIn('fast');
			}
			if (typeof($callback) === 'function') {
				toDom.fadeIn('fast', $callback);
			} else {
				toDom.fadeIn('fast');
			}
		}
	};

	/**
	 * Block the Editing Panel
	 * @param {function} callback that call after block the editing panel
	 */
	var _blockEditor = function ($callback) {
		$("." + CLASSES.block, _panelWrapper)
			.width(_panelWrapper.outerWidth() + 3)
			.show();

		if (typeof($callback) === 'function') {
			$callback.call(this);
		}
	};

	/**
	 * Unblock the Editing Panel
	 * @param {function} callback that call after unblock the editing panel
	 */
	var _unblockEditor = function ($callback) {
		$("." + CLASSES.block, _panelWrapper).hide();

		if (typeof($callback) === 'function') {
			$callback.call(this);
		}
	};

	/**
	 * Hide add media uploader and unblock the editing panel
	 */
	var _hideMediaUploader = function () {
		$("." + CLASSES.mediaPanel, _panelWrapper).hide();
		_unblockEditor();
	}

	/**
	 * Hide add media uploader and unblock the editing panel
	 */
	var _hideNewCollectionPanel = function () {
		$("." + CLASSES.newCollectionPanel, _panelWrapper).hide();
		_unblockEditor();
	}

	/**
	 * Hide password panel and unblick the editing panel
	 */
	var _hidePasswordPanel = function () {
		$("." + CLASSES.passwordPanel, _panelWrapper).hide();
		_unblockEditor();
	}

	/**
	 * Show license selection panel
	 */
	var _showLicensePanel = function () {
		clearTimeout(_outTimeout);
		$("#" + IDS.panelHead + " ." + CLASSES.licensePanel).show();
	};

	/**
	 * Hide license selection panel
	 * SetTimeout prevent panel from disappear 
	 * when user moves out of panel accidentally
	 */
	var _hideLicensePanel = function () {
		_outTimeout = setTimeout( 
			function () {
				$("#" + IDS.panelHead + " ." + CLASSES.licensePanel).hide();
			},
			500
		);
	};

	/**
	 * Change license type and hide license selection panel
	 * @param dom dom eletement that should be selected
	 */
    var _selectLicense = function ($target) {

		var panelHead    = $("#" + IDS.panelHead, _panelWrapper),
			licensePanel = $("." + CLASSES.licensePanel, panelHead),
			licenseType  = $target.attr("id");

        $("#" + IDS.license, panelHead)
			.children("img")
			.replaceWith($("img", $target).clone());

		// Reset the license type with default order
		// and move selected license to first one
		licensePanel.hide()
			.html(HTML.licensePanel.join(''))
			.find("#" + licenseType)
				.addClass(CLASSES.selected)
				.prependTo(licensePanel);
    };

	/**
	 * Close the main panel or close the toolPanel
	 * @param Event $event
	 */
	var _closeBtnClickHandler = function ($event) {

		var target   = $($event.target),
			response = false,
			marker   = null;

		if (target.parent().hasClass(CLASSES.toolPanel)) { 
			// It's toolPanel's Close Button
			_closeToolPanel($event);
		} else if ( target.parent().hasClass(CLASSES.bookCover)) {
			_removeBook(target.parent().data("Id"));
		} else if ( target.parent().hasClass(CLASSES.newCollectionBtn)) {
			_closeCollectionPanel();
		} else { 
			// Otherwise, it's Main Panel's Close Button

			HyperCities.objectEditPanel.close(
        function() {
  				HyperCities.earth.getEarthAddMediaCtrl().reset();
        }
			);
		}

		return false;
    };

	/**
	 * Save the new object or update the current object
	 * @param Event $event
	 */
	var _saveBtnClickHandler = function ($event) {

		// Do nothing if it's disabled
		if ($($event.target).hasClass(CLASSES.disabled)) {
			return false;
		}
		var enableProfiler = false;
		if ($event.ctrlKey) {
			enableProfiler = true;
		}

		// Determin which type of object should save
		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK ||
			_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK) {
			_validateKml();
		} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.PLACEMARK ||
			_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
			_saveObject(enableProfiler);
		} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.FOLDER) {
			_saveFolder();
		}

		return false;
	};

	/**
	 * Cancel the action on current top panel
	 * @param Evnet $event
	 */
	var _cancelBtnClickHandler = function ($event) {

		var mediaPanel = $("." + CLASSES.mediaPanel, _panelWrapper),
			newCollectionPanel = $("." + CLASSES.newCollectionPanel, _panelWrapper),
			passwordPanel = $("." + CLASSES.passwordPanel, _panelWrapper);

		if (mediaPanel.is(":visible")) {
			_hideMediaUploader();
		}
		if (newCollectionPanel.is(":visible")) {
			_hideNewCollectionPanel();
		}
		if (passwordPanel.is(":visible")) {
			_hidePasswordPanel();
		}

	};

	/**
	 * Try to fetch the kml link
	 * use option to pass success and error callback function
	 * @param {String} the URL of KML/KMZ file need to process
	 * @param {Object} Options
	 * @return {GLatLngBounds}
	 */
	var _fetchKmlLink = function ($url, $options) {

		var linkUrl      = $url || "",
			options      = $options || {},
			kmlRegExp    = new RegExp("output=nl"),
			kmlOverlay   = null,
			tempListener = null;

		if (linkUrl === "") {
			alert(HTML.noKmlLink);
			return false;
		}

		// Preprocess Google Map KML Link
		linkUrl = linkUrl.replace(kmlRegExp, "output=kml");

		kmlOverlay = new GGeoXml(linkUrl);

		tempListener = GEvent.addListener(kmlOverlay, "load", 
			function () {
				var self = this;

				// Check if we loaded the kml correctly 
				if (kmlOverlay.getDefaultBounds() instanceof GLatLngBounds) {
					// If there's success callback, call the callback
					if (typeof(options.success) === 'function') {
						options.success.call(self, kmlOverlay);
					}
				} else { // Fail to load KML file
					// If there's error callback, call the callback
					if (typeof(options.error) === 'function') {
						options.error.call(self);
					}
				}
				// Remove load event of kmlOverlay, 
				// otherwise it will triger everytime when map zoom/pan
				GEvent.removeListener(tempListener);
				tempListener = null;
				kmlOverlay = null;
				options = null;
			}
		);
	};

	/**
	 * Remove the preview overlay on map/earth
	 */
	var _removeKml = function () {

		// If there exist old overlay of 2D
    /*
		if (_kmlPreview instanceof GOverlay) {
			HyperCities.mainMap.removeOverlay(_kmlPreview);
		} else if (_kmlPreview !== null) { // Is on Earth
    */
			HyperCities.earth.removeKmlObject(_kmlPreview);
		//}

		// Reset _kmlPreview
		_kmlPreview = null;
	};

	/**
	 * Overlay the KML Preview on map/earth
	 * @param {GOverlay} the KML Overlay need to show
	 */
	var _previewKml = function ($KmlOverlay) {

		//var map     = HyperCities.mainMap.getMapInstance(),
		var	isLink  = ($("#" + IDS.kmlLink, _panelWrapper).attr("disabled") === false),
			fileUrl = $("#" + IDS.kmlFile, _panelWrapper).data("url"),
			linkUrl = $("#" + IDS.kmlLink, _panelWrapper).val();

		// If there exist old overlay, remove it first
		if (_kmlPreview !== null) {
			_removeKml();
		}

		// Add new kml overlay (i.e. $KmlOverlay)
		_kmlPreview = $KmlOverlay;
		//if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
			HyperCities.earth.appendKmlObject(_kmlPreview);

			// check if the flyToView is enabled in the networklink
			if (_kmlPreview.getType() === "KmlNetworkLink" &&
				!_kmlPreview.getFlyToView()) {
				// if flyToView is enabled, do nothing
			} else {
				HyperCities.earth.flyToObject(_kmlPreview);
			}
/*
		} else {
			_kmlPreview.gotoDefaultViewport(map);
			HyperCities.mainMap.addOverlay(_kmlPreview);
		}
*/
		if (isLink) {
			// Change the previewUrl button
			$("." + CLASSES.previewBtn, _panelWrapper)
				.removeClass(CLASSES.disabled)
				.html("Remove KML preview");

			// Set the correct URL to #HCMetadata
			$("#" + IDS.metaData, _panelWrapper).val(linkUrl);
		} else {
			// Change the previewFile link
			$("." + CLASSES.previewFile, _panelWrapper)
				.removeClass(CLASSES.disabled)
				.html("Remove");

			// Set the correct URL to #HCMetadata
			$("#" + IDS.metaData, _panelWrapper).val(fileUrl);
		}
	};

	/**
	 * Show the preview fail message and reset the preview button
	 */
	var _previewFail = function () {

		var isLink = ($("#" + IDS.kmlLink, _panelWrapper).attr("disabled") === false);

		// If there exist old overlay, remove it
		if (_kmlPreview !== null) {
			_removeKml();
		}

		alert(HTML.failLoadKml.join(''));

		if (isLink) {
			// Reset the preview Url button
			$("." + CLASSES.previewBtn, _panelWrapper)
				.removeClass(CLASSES.disabled)
				.html("Preview KML file");
		} else {
			// Reset Kml File Uploader
			_resetKmlUploader();
		}

		// Reset the #HCMetadata field
		$("#" + IDS.metaData, _panelWrapper).val("");
	};

	/**
	 * Toggle the KML File overlay (preview before adding) on map
	 */
	var _toggleKmlFilePreview = function () {

		var fileUrl      = $.trim($("#" + IDS.kmlFile, _panelWrapper).data("url")),
			previewLink  = $("." + CLASSES.previewFile, _panelWrapper),
			tempListener = null,
			fetchFunc    = null;

		if (previewLink.hasClass(CLASSES.disabled)) {
			return false;
		}

		if (fileUrl !== "") {
			// If there exist old overlay, remove it
			if (_kmlPreview !== null) {
				_removeKml();
				previewLink.html("Preview");
			} else { // Otherwise, add the kml overlay for preview
				previewLink
					.addClass(CLASSES.disabled)
					.html("Loading");

				// Try to fetch the KML/KMZ link, preview the file if success
				//if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
					fetchFunc = HyperCities.earth.fetchKmlLink;
        /*
				} else {
					fetchFunc = _fetchKmlLink;
				}
        */

				fetchFunc.call(this, fileUrl, {
						success: _previewKml,
						error  : _previewFail
					}
				);
			}
		}

		return false;
	};

	/**
	 * Toggle the KML Link overlay (preview before adding) on map
	 */
	var _toggleKmlLinkPreview = function () {

		var linkUrl      = $.trim($("#" + IDS.kmlLink, _panelWrapper).val()),
			kmlRegExp    = new RegExp("output=nl"),
			previewBtn   = $("." + CLASSES.previewBtn, _panelWrapper),
			tempListener = null,
			fetchFunc    = null;

		if (previewBtn.hasClass(CLASSES.disabled)) {
			return false;
		}

		if (linkUrl !== "") {
			// If there exist old overlay, remove it
			if (_kmlPreview !== null) {
				_removeKml();
				previewBtn.html("Preview KML file");
			} else { // Otherwise, add the kml overlay for preview
				previewBtn
					.addClass(CLASSES.disabled)
					.html("Loading KML ...");
				
				// Preprocess Google Map KML Link
				linkUrl = linkUrl.replace(kmlRegExp, "output=kml");

				// Try to fetch the KML/KMZ link, preview the file if success
				//if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
					fetchFunc = HyperCities.earth.fetchKmlLink;
        /*
				} else {
					fetchFunc = _fetchKmlLink;
				}
        */

				fetchFunc.call(this, linkUrl, {
						success: _previewKml,
						error  : _previewFail
					}
				);
			}
		} else {
			alert(HTML.noKmlLink);
		}

		return false;
	};

	/**
	 * Delete Current Object
	 */
	var _deleteObject = function () {

		var response = false,
			params   = {};

		response = window.confirm(HTML.delMessage);

		if ( !response ) {
			return false;
		}

		// Call Delete Collection Function
		// Temp Auth: User Id
		params = {
			userId   : HyperCities.user.getUserId(),
			objectId : _currentObjectId,
			parentId : _currentParentId
		};

		$.post(URLS.deleteObject, params, _deleteHandler, "xml");
//		$.ajax({
//			type: "DELETE",
//			url : URLS.deleteObject,
//			data: params,
//			success : _deleteHandler,
//			dataType: "json"
//		});
	};

	/**
	 * Things to do before closing the object editing panel
	 */
	var _closeMainPanel = function () {
		// HyperCities.util.debug(_id + "[A2] Close object edit panel ");
		_reset();

		// remove/reset all elements from the view
		HyperCities.mapList.clearMaps();
		HyperCities.mainMap.clearDynamicMaps();

		// Update CollectionList
		setTimeout(function() {
			//seems no need to render collection list when closing
			HyperCities.collectionList.update(HyperCities.mainMap.getBounds(),
				HyperCities.mainMap.getZoom(), false);
			HyperCities.collectionList.uncheckAllItems();
			HyperCities.collectionList.collapseAllFolders();
		},1000);
    
	};

	/**
	 * Prepare metadata to send to server
	 * @return {Object} object for POST ajax query
	 */
	var _setMetadata = function () {

		var metadata  = {},
			parentsId = [],
			dateStr   = "",
			yearStr   = "",
			linkUrl   = "",
			baseMap   = [],
			bookmark  = [],
			isLink    = ($("#" + IDS.kmlLink, _panelWrapper).attr("disabled") === false),
			isHidden  = $("#" + IDS.isHidden, settingForm).attr("checked")? 1:0,
			kmlRegExp = new RegExp("output=nl"),
			metaForm  = $("#" + IDS.metaForm),
			contentForm = $("#" + IDS.contentForm),
			settingForm = $("#" + IDS.settingForm),
			currentIndex = -1;

		if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
			metadata.objectId = _currentObjectId;
		}

		metadata.creator   = $("#" + IDS.author, metaForm).val();
		metadata.password  = $("#" + IDS.passcode, metaForm).val().trim();
		metadata.title     = $("#" + IDS.title, metaForm).val();
		metadata.copyright = $("." + CLASSES.licensePanel, metaForm)
								.children(":first")
								.attr("id");

		var jsonArr = [];
		for (var i in _passwords) {
			jsonArr.push( '{ "id" : ' + _passwords[i].id + ', "password" :  "' + _passwords[i].password + '" } ,' );
		}
		metadata.collectionPasswords = '{' + jsonArr.join(',') + '}';
		metadata.mapType = HyperCities.mainMap.getMapTypeId();
		metadata.markerType = _markerType;
		metadata.objectType = _objectType;
		metadata.view = HyperCities.earth.getView();
		metadata.zoom = HyperCities.mainMap.getZoom();

		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
			metadata.kml = HyperCities.earth.getEarthAddMediaCtrl().getObjKml();
		}
			
		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.PLACEMARK ||
			_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
			// It is not KML, we have description and LatLng
            metadata.latlng  = HyperCities.earth.getEarthAddMediaCtrl().getLatLng();
			metadata.content = $("#" + IDS.description, contentForm)
								.htmlarea("toHtmlString");
		} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK ||
			_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK) {
			// It is a KML Link or KML File
			linkUrl = $.trim($("#" + IDS.metaData, _panelWrapper).val());
			// Preprocess Google Map KML Link
			linkUrl = linkUrl.replace(kmlRegExp, "output=kml");
			metadata.link = encodeURIComponent(linkUrl);

			// Determin KML Link Type
			//if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
				metadata.buildings = HyperCities.earth.isBuildingOn();
				if (isLink) {
					metadata.objectType = HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK;
				} else {
					metadata.objectType = HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT;
				}
      /*
			} else {
				if (isLink) {
					metadata.objectType = HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK;
				} else {
					metadata.objectType = HyperCities.config.HC_OBJECT_TYPE.PLACEMARK;
				}
			}
      */
		} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.FOLDER) {
			// It's a folder, does not contain LatLng, and content is plaintext
			metadata.content = $("#" + IDS.description, contentForm).val();
		}

		if (!metadata.title) {
			alert(HTML.noTitle);
			$("#" + IDS.title, metaForm).focus();
			return false;
		}

		metadata.dateFrom = $("#" + IDS.startTime, metaForm)
								.dateEntry('getDate');
		metadata.dateTo   = $("#" + IDS.endTime, metaForm)
								.dateEntry('getDate');

		if ( metadata.dateFrom !== null ) {
			if (metadata.dateFrom.getFullYear() < 1) {
				dateStr = "-";
				yearStr = "0000" + (0 - metadata.dateFrom.getFullYear() + 1);
			} else {
				dateStr = "";
				yearStr = "0000" + metadata.dateFrom.getFullYear();
			}
			yearStr = yearStr.substring(yearStr.length - 4);
			dateStr += yearStr;
			dateStr += metadata.dateFrom.toString("-MM-ddTHH:mm:ss-08:00");
			metadata.dateFrom = dateStr;
		}

		if ( metadata.dateTo !== null ) {
			if (metadata.dateTo.getFullYear() < 1) {
				dateStr = "-";
				yearStr = "0000" + (0 - metadata.dateTo.getFullYear() + 1);
			} else {
				dateStr = "";
				yearStr = "0000" + metadata.dateTo.getFullYear();
			}
			yearStr = yearStr.substring(yearStr.length - 4);
			dateStr += yearStr;
			dateStr += metadata.dateTo.toString("-MM-ddTHH:mm:ss-08:00");
			metadata.dateTo = dateStr;
		}

		// Temp:: need to rewrite
		parentsId = $.map($("." + CLASSES.collectionPanel + " input:checked"),
			function ($node) {
				return $($node).parent().data("id");
			}
		);

		if (!parentsId.length) {
			alert(HTML.noParent);
			return false;
		}

		metadata.parents = parentsId.toString();

		// Bubble State
		metadata.bubble = ['{"id": ', 'null', ', "state": ', '"min"', '}'];
		if ( HyperCities.session.get("infoWin") !== null ) {
			metadata.bubble[1] = HyperCities.session.get("infoWin");
		}
		if ( HyperCities.session.get("maxInfoWin") ) {
			metadata.bubble[3] = '"max"';
		}
		metadata.bubble = metadata.bubble.join('');


		// TODO:: Here's the share feature
		metadata.state = HyperCities.config.HC_OBJECT_STATE.PROTECTED;
		// Privilege: Coauthor feature. TODO: rewrite in the future
		var coauthors = [];

		$(".coauthorItem", _panelWrapper).each(
				function(index, element) { 
					coauthors.push($(this).data('id'));
				}); 

		metadata.coauthors = coauthors.join(',');

		// share all objects in this collection
		metadata.shareAll = $("#" + IDS.shareAll, _panelWrapper).attr('checked') ? 1:0;



		// default the marker is visible
		metadata.markerState = isHidden;

		// TODO:: extract baseMap of Object
		baseMap = ['{"baseMap": ['];
		$.each(HyperCities.session.get("map"),
			function ($index) {
				var mapStr = ['{"id": ', parseInt(this.id),
					', "opacity": ', this.tileOpacity,
					', "z-index": ', $index, '}'];
				baseMap.push(mapStr.join(''));
				baseMap.push(', ');
			}
		);
		// Get Dynamic base map
		$.each(HyperCities.mainMap.getDynamicMaps(),
			function ($index) {
				var mapStr = ['{"tileType": "' + this.type + '" ',
					', "tileUrl": "', this.url,
					'", "opacity": ', this.tileOverlay._opacity || 1.0,
					', "layers": [', this.layers, ']',
					', "z-index": -1}'];
				baseMap.push(mapStr.join(''));
				baseMap.push(', ');
			}
		);
		if (baseMap.length > 1) {
			baseMap.pop(); // remove last comma
		}
		baseMap.push(']}');
		metadata.baseMap = baseMap.join('');

		// Add Bookmarks
		bookmark = ['{"bookmarks": ['];
		$.each($("." + CLASSES.currentBook).children(),
			function ($index) {
				var bookItem = $(this),
						bookStr = ['{"bookId": "', 
						bookItem.data("Id").split("_").reverse()[0],
						'", "pageNo": "', bookItem.data("pageNo"),
						'", "bookTitle": "', bookItem.data("bookTitle"),
						'", "coverUrl": "',  bookItem.data("thumbnail"),
						'"}'];
				bookmark.push(bookStr.join(''));
				bookmark.push(', ');
			}
		);
		if (bookmark.length > 1) {
			bookmark.pop();
		}
		bookmark.push(']}');
		metadata.bookmarks = bookmark.join('');

		// Get objectID list from object selectior,
		// remove ObjectId that is currently editing from the list
		metadata.objects = HyperCities.collectionList.getCheckedCollections();
		currentIndex = $.inArray(metadata.objectId, metadata.objects);
		if (currentIndex >= 0 ) {
			metadata.objects.splice(currentIndex,1);
		}
		if ( metadata.objects.length > 0 ) {
			metadata.objects = metadata.objects.join(",");
		} else {
			metadata.objects = null;
		}

		// Temp Auth: User Id
		metadata.userId = HyperCities.user.getUserId();

		if ( _objectData && _objectData.owner ) {
			metadata.owner = _objectData.owner;
		} else {
			metadata.owner = metadata.userId;
		}

		return metadata;
	};



	/**
	 * Provide feedback for delete action AJAX Call
	 * @param {XML} the data returned from the server
	 */

	var _deleteHandler = function ($response) {
		var response = $($response),
			success  = response.find("Success > Message").text(),
			error    = response.find("Error > Message").text(),
			textDiv  = $("." + CLASSES.feedbackBox);

		if (success.length > 0) { // Action Success
			alert(success);
			_isSaved = true; // No need for save reminder
			HyperCities.objectEditPanel.close(
				HyperCities.mainMap.resetAddMediaControl // Callback
			);

			// Remove old object from HCObject, so it will get update
			HyperCities.collectionList.removeItem(_currentObjectId);
			// Update CollectionTree
			HyperCities.collectionList.update(null, null, true);
		} else if (error.length > 0) { // Action Fail
			alert(error);
		}
	};

	/** Provide feedback for save/update Action AJAX Call to webService
	 *  @param {JSON} the data returned from web service
	 */
	var _wsSaveHandler = function ($response, $textStatus, $XHR){

		if ($response.profilerUrl) {
			window.open("http://linuxdev.ats.ucla.edu" + $response.profilerUrl, "_blank","toolbar=yes, location=yes, directories=no, status=no, menubar=yes, scrollbars=yes, resizable=no, copyhistory=yes, width=800, height=600");
			$response = $response.data;
		}
		var response = $response,
			success  = ($XHR.status === 201 || $XHR.status === 202),
			error    = !success,
			textDiv  = $("." + CLASSES.feedbackBox),
			metaForm = $("#" + IDS.metaForm);

		_passwords = [];

		if (success) { // Action Success
			if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
				alert("Object updated successfully.");
			} else {
				alert("Object added successfully.");
			}
			_isSaved = true;

			// If user are previous in Narrative Mode, update the collection info
			if (_originalMode === HyperCities.config.MODE_NARRATIVE) {
				HyperCities.narrativePanel.updateCollection(_currentObjectId, {
						title: $("#" + IDS.title, metaForm).val(),
						description: $("#" + IDS.description).val(),
						creator: $("#" + IDS.author, metaForm).val()
					}
				);
			}

			// Close the EditPanel
			HyperCities.objectEditPanel.close(
        function() {
				  HyperCities.earth.getEarthAddMediaCtrl().reset()// Callback
        }
			);

			// Remove Dynamic Maps
			HyperCities.mainMap.clearDynamicMaps();

			HyperCities.collectionList.removeItem(_currentObjectId);
			setTimeout(function() {
				HyperCities.narrativePanel.reloadRichObject(_currentObjectId);
			}, 1000);
			// Remove old object from HCObject, so it will get update
			//HyperCities.collectionList.removeItem(_currentObjectId);
			//HyperCities.collectionList.update(null, null, true);

		} else if (error) { // Action Fail
			// Reset the #HCMetadata field
			$("#" + IDS.metaData, _panelWrapper).val("");

			// Enable Save Button
			$("." + CLASSES.saveBtn, _panelWrapper)
				.removeClass(CLASSES.disabled);

			if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
				alert("Fail updating your object.");
			} else {
				alert("Fail adding your object.");
			}
		}
	};

	/**
	 * Provide feedback for save/update action AJAX Call
	 * @param {XML} the data returned from the server
	 */
	var _saveHandler = function ($response) {
		var response = $($response),
			success  = response.find("Success > Message").text(),
			error    = response.find("Error > Message").text(),
			textDiv  = $("." + CLASSES.feedbackBox),
			metaForm = $("#" + IDS.metaForm);

		if (success.length > 0) { // Action Success
			alert(success);
			_isSaved = true;

			// If user are previous in Narrative Mode, update the collection info
			if (_originalMode === HyperCities.config.MODE_NARRATIVE) {
				HyperCities.narrativePanel.updateCollection(_currentObjectId, {
						title: $("#" + IDS.title, metaForm).val(),
						description: $("#" + IDS.description).val(),
						creator: $("#" + IDS.author, metaForm).val()
					}
				);
			}

			// Close the EditPanel
			HyperCities.objectEditPanel.close(
				HyperCities.mainMap.resetAddMediaControl // Callback
			);

			HyperCities.collectionList.removeItem(_currentObjectId);
			setTimeout(function() {
				HyperCities.narrativePanel.reloadRichObject(_currentObjectId);
			}, 1000);
			// Remove old object from HCObject, so it will get update
			// HyperCities.collectionList.removeItem(_currentObjectId);
			// HyperCities.collectionList.update(null, null, true);

		} else if (error.length > 0) { // Action Fail
			// Reset the #HCMetadata field
			$("#" + IDS.metaData, _panelWrapper).val("");

			// Enable Save Button
			$("." + CLASSES.saveBtn, _panelWrapper)
				.removeClass(CLASSES.disabled);

			alert(error);
		}

	};

	/**
	 * Provide feedback for save/update action AJAX Call
	 * @param {XML} the data returned from the server
	 */
	var _responseHandler = function ($response) {

		var success = $($response).find("Success > Message").text(),
			error   = $($response).find("Error > Message").text(),
			textDiv = $("." + CLASSES.feedbackBox);

		if (success.length > 0) { // Action Success
			alert(success);
		} else if (error.length > 0) { // Action Fail
			textDiv.empty()
				.addClass(CLASSES.error)
				.html(error);
		}
	};

	/**
	 * Provide feedback for upload KML files
	 * If success, store real url in data field of DOM #HCKmlFile
	 * @param {XML} the data returned from the server
	 */
	var _kmlUploaderHandler = function ($response) {

		var error   = $($response).find("Error > Message").text(),
			textDiv  = $("." + CLASSES.feedbackBox,  _panelWrapper);

		if (error.length > 0) { // Action Fail
			// Show Error Message
			textDiv.empty()
				.addClass(CLASSES.error)
				.html(error);

			// Reset File Upload Button
			$("." + CLASSES.uploadKmlBtn, _panelWrapper)
				.removeClass(CLASSES.disabled);

			$("#" + IDS.kmlFile, _panelWrapper)
				.val("")
				.data("url", "");
		} else {
		
			var ret      = $.parseJSON($response.text()),
				success  = ret.success,
				metaForm = $("#" + IDS.metaForm);

			if (success) { // Action Success
				// Show File Information
				textDiv.empty()
					.html(HTML.previewItem.join(''))
					.find("." + CLASSES.previewFilename)
					.html($("#" + IDS.kmlFile, _panelWrapper).val());

				// Setup link and disable KML URL Function
				$("#" + IDS.kmlFile, _panelWrapper)
					.data("url", ret.url);
				$("#" + IDS.kmlLink, _panelWrapper)
					.val("")
					.attr("disabled", true);
				$("." + CLASSES.previewBtn, _panelWrapper)
					.html("Preview KML file")
					.addClass(CLASSES.disabled);

				// load meta data returned by server
				if (ret.author !== null) {
					$("#" + IDS.title, metaForm).val(ret.author);
				}
				if (ret.title !== null) {
					$("#" + IDS.title, metaForm).val(ret.title);
				}
				if (ret.startTime !== null) {
					$("#" + IDS.startTime, metaForm)
						.dateEntry('setDate', HyperCities.util.parseDateTime(ret.startTime));
				}
				if (ret.endTime !== null) {
					$("#" + IDS.endTime, metaForm)
						.dateEntry('setDate', HyperCities.util.parseDateTime(ret.endTime));
				}

				// Remove old preview overlay
				if (_kmlPreview !== null) {
					_removeKml();
				}
			} else {
				// Reset File Upload Button
				$("." + CLASSES.uploadKmlBtn, _panelWrapper)
					.removeClass(CLASSES.disabled);

				$("#" + IDS.kmlFile, _panelWrapper)
					.val("")
					.data("url", "");
			}

			// print warning info
			if (ret.unauthObj.length != 0) {
				var objectList = ret.unauthObj.join();
				HTML.unauthObjWarn.splice(1, 0, objectList);
				alert(HTML.unauthObjWarn.join(""));
				HTML.unauthObjWarn.splice(1, 1);
			}
		}
	};

	/**
	 * Validate KML Link/Files before save
	 */
	var _validateKml = function () {

		var isLink      = ($("#" + IDS.kmlLink, _panelWrapper).attr("disabled") === false),
			previewLink = $.trim($("#" + IDS.metaData, _panelWrapper).val()),
			linkUrl     = "",
			noLinkMsg   = "",
			previewed   = false,
			previewFunc = null,
			fetchFunc   = null;

		if (isLink) { // User adding external KML/KMZ link
			linkUrl = $.trim($("#" + IDS.kmlLink, _panelWrapper).val());
			noLinkMsg = HTML.noKmlLink;
			previewFunc = _toggleKmlLinkPreview;
		} else { // User uploading KML/KMZ file
			linkUrl = $("#" + IDS.kmlFile, _panelWrapper).data("url");
			noLinkMsg = HTML.noFileUrl;
			previewFunc = _toggleKmlFilePreview;
		}

		// First check if link is empty
		if (!linkUrl) {
			alert(noLinkMsg);
			return;
		}
		// Also check if user already preview the link
		if (linkUrl === previewLink) {
			previewed = true;
		}

		// If not, prompt user's to preview the link
		// OK to preview (set previewed false)
		// Cancel to save (set previewed true)
		if (!previewed) {
			previewed = !window.confirm(HTML.notPreviewed.join(''));
		}

		// If user wants to preview the link, abort saving and triger preview
		if (!previewed) {
			previewFunc.call(this);
		} else { // Save the kml Link
			// Assign final link url
			$("#" + IDS.metaData, _panelWrapper).val(linkUrl);

			// Try to fetch the KML/KMZ link, save kml if success
			//if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
				fetchFunc = HyperCities.earth.fetchKmlLink;
      /*
			} else {
				fetchFunc = _fetchKmlLink;
			}
      */

			fetchFunc.call(this, linkUrl, {
					success: _saveKml,
					error  : _previewFail
				}
			);
		}
	};

	/**
	 * Save KML Object
	 * @param {GOverlay} the kml Overlay that will be saved
	 */
	var _saveKml = function ($kmlOverlay) {

		var params    = _setMetadata(),
			bounds    = null,
			actionUrl = URLS.addNewObject;

		if (!params) return; // Abort saving if we cannot obtain metadata

		// Change actionUrl if we are updating Kml Link
		// Or we are uploading files
		if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
			actionUrl = URLS.updateObject + params.objectId;
		} else if ($("#" + IDS.kmlFile, _panelWrapper).val()) {
			actionUrl = URLS.addKmlFile;
			// Assign command
			params[IDS.command] = "commit";
		}

		// Compute Bounds base on $kmlOverlay
		//if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
			// Get bounds for 3D
			bounds = HyperCities.earth.getObjectBounds($kmlOverlay); 
			if (bounds === null) {
				bounds = HyperCities.earth.getBounds();
			}

			if (bounds === null || bounds === undefined ) {
				alert(HTML.no3DBound.join(''));
				return;
			}

			params.bounds = '{"west": ' + bounds.west
						+ ', "south": ' + bounds.south
						+ ', "east": ' + bounds.east
						+ ', "north": ' + bounds.north
						+ '}';
    /*
		} else {
			// Get bounds for 2D
			bounds = $kmlOverlay.getDefaultBounds();
			// If the bounds is the whole world,
			// This might be an error of parsing earth object
			if (bounds.isFullLat() && bounds.isFullLng()) {
				alert(HTML.no2DBound.join(''));
				return;
			} else {
				params.bounds = '{"west": ' + bounds.getSouthWest().lng()
							+ ', "south": ' + bounds.getSouthWest().lat()
							+ ', "east": ' + bounds.getNorthEast().lng()
							+ ', "north": ' + bounds.getNorthEast().lat()
							+ '}';
			}
		}
    */

		// Disable Save Button
		$("." + CLASSES.saveBtn, _panelWrapper)
			.addClass(CLASSES.disabled);

		$.post(actionUrl, params, _wsSaveHandler, "json");
	};


	/**
	 * Validate metadata of objects
	 */
	var _validateObject = function($params) {
		
		var valid = true;

		if (!$params) {
			alert("Cannot acquire the metadata of the object.");
			valid = false;
		}
		if ($params.latlng === '{"latlng": []}' && $params.objectType ==
				HyperCities.config.HC_OBJECT_TYPE.PLACEMARK) {
			alert("Cannot acquire the location of the object.\n" +
					"If this is a map object, please edit it in map mode.\n" +
					"If this is an earth object, please edit it in earth mode.");
			valid = false;
		}

		return valid;
	};

	/**
	 * Save regular Object
	 */
	var _saveObject = function ($enableProfiler) {

		var params    = _setMetadata(), // prepare data to submit
			actionUrl = URLS.addNewObject;


		//if (!params) return; // Abort saving if we cannot obtain metadata
		if (!_validateObject(params)) return;
		if ($enableProfiler) {
			params.profile = 1;
		}

		// Change actionUrl if we are updating object
		if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
			actionUrl = URLS.updateObject + params.objectId;
		}

		// Disable Save Button
		$("." + CLASSES.saveBtn, _panelWrapper)
			.addClass(CLASSES.disabled);

//		$.post(actionUrl, params, _saveHandler, "xml");
		$.post(actionUrl, params, _wsSaveHandler, "json");
	};

	/**
	 * Save Collection (Folder) Object
	 */
	var _saveFolder = function () {

		var params    = _setMetadata(), // prepare data to submit
			actionUrl = URLS.addNewCollection;

		// collections only have descriptions
		params.description  = params.content;

		// set responseType to xml. Another type is json.
		params.responseType = "xml";

		if (!params) return; // Abort saving if we cannot obtain metadata

		// Change actionUrl if we are updating object
		if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
			actionUrl = URLS.updateCollection;
		}

		// Disable Save Button
		$("." + CLASSES.saveBtn, _panelWrapper)
			.addClass(CLASSES.disabled);

		$.post(actionUrl, params, _saveHandler, "xml");
	};

	/**
	 * Custom Image Uploader for jHtmlArea
	 */
	var _imageUploader = function ($btn) {
		// 'this' = jHtmlArea object
		// '$btn' = jQuery object that represents the <A> "anchor" tag
		// for the Toolbar Button
		var panelEdit  = $("." + CLASSES.htmlArea).find("iFrame"),
			panelTop   = panelEdit.offset().top,
			panelWidth = panelEdit.width(),
			buttonDiv  = null,
			buttonBox  = {};

		_blockEditor();

		// Show Image Uploader Panel
		$("." + CLASSES.mediaPanel)
			.css("top", panelTop)
			.css("width", panelWidth - 2)
			.find("." + CLASSES.mediaPanelContent)
				.html(HTML.imageUploader.join(''))
				.end()
			.find("#" + IDS.mediaLink)
				.form_prompt(HTML.imgLinkPrompt)
				.end()
			.show()
			.find("." + CLASSES.cancelBtn)
				.css("top", $("." + CLASSES.insertBtn).offset().top);

		_initUploader($("." + CLASSES.uploadMediaBtn), 
				$("#" + IDS.mediaFile),
				{ext: "jpg|jpeg|gif|png|bmp", callback: _uploadImage});

		_jHtmlarea = this;

	};

	var _closeNewCollectionPanel = function () {
		$("." + CLASSES.newCollectionPanel, _panelWrapper).hide();
	}

	/**
	 * Show add new collection panel
	 */
	var _showNewCollectionPanel = function () {

		var panelEdit  = $("." + CLASSES.contentPanel),
			panelTop   = panelEdit.offset().top,
			panelWidth = panelEdit.width();

		_blockEditor();

		// Show Add New Collection Panel
		$("." + CLASSES.newCollectionPanel, _panelWrapper)
			.css("top", panelTop)
			.css("width", panelWidth - 4)
			.find("#" + IDS.newName)
				.val("")
				.end()
			.find("." + CLASSES.feedbackBox)
				.empty()
				.end()
			.show()
			.find("#" + IDS.newName) // Can be focused after show
				.focus()
				.end()
			.find("." + CLASSES.addBtn)
				.removeClass(CLASSES.disabled)
				.end()
			.find("." + CLASSES.cancelBtn)
				.css("top", $("." + CLASSES.addBtn).offset().top);

	};

	/**
	*added by youlu
	*/
	var _closeCollectionPanel = function () {	
		$("." + CLASSES.collectionPanel, _panelWrapper)
			.hide();
	};

	/**
	 * Show password panel
	 */
	var _showPasswordPanel = function ($id) {

		var panelEdit  = $("." + CLASSES.contentPanel),
			panelTop   = panelEdit.offset().top,
			panelWidth = panelEdit.width();

		_blockEditor();

		// Show Add New Collection Panel
		$("." + CLASSES.passwordPanel, _panelWrapper)
			.css("top", panelTop)
			.css("width", panelWidth - 4)
			.data("id", $id)
			.find("#" + IDS.password)
				.val("")
				.end()
			.find("." + CLASSES.feedbackBox)
				.empty()
				.end()
			.show()
			.find("#" + IDS.password) // Can be focused after show
				.focus()
				.end()
			.find("." + CLASSES.sendPwdBtn)
				.removeClass(CLASSES.disabled)
				.end()
			.find("." + CLASSES.cancelBtn)
				.css("top", $("." + CLASSES.sendPwdBtn).offset().top);

	};

	/**
	 * Check collection password
	 */
	var _checkPwdCollection = function ($event) {

		var collectionId   = $("." + CLASSES.passwordPanel, _panelWrapper).data("id"),
			password       = $("#" + IDS.password, _panelWrapper).val(),
			params         = {};
	
		if (password !== "") {
			params = {
				id: collectionId,
				password: HyperCities.util.MD5(password)
			};

			$("." + CLASSES.addBtn, _panelWrapper)
				.addClass(CLASSES.disabled);

			// TODO:: Add timeout handler
			$.post(URLS.checkPassword, params, function($data) {
				if (!$data.auth) {
					alert(HTML.wrongPassword);
					$("#" + IDS.password, _panelWrapper).val("").focus();
				} else {
					_passwords.push (params),
					$("#" + IDS.panelFooter + " input[name=collection_"+$data.id+"]").attr("checked",
						true);
					_hidePasswordPanel();

					HyperCities.session.set("authedCollection", collectionId);
				}
			}, "json");
		} else {
			alert(HTML.noPassword);
			$("#" + IDS.password, _panelWrapper).focus();
		}
	};

	/**
	 * Add New Collection
	 */
	var _addNewCollection = function () {

		var name       = $("#" + IDS.newName, _panelWrapper).val(),
			password   = $("#" + IDS.newPwd, _panelWrapper).val().trim(),
			params     = {};


		if (name !== "") {
			params = {
				title: name,
				creator: HyperCities.user.getNickname(),
				copyright: IDS.ccBY,
				description: "",
				//state: HyperCities.config.HC_OBJECT_STATE.PROTECTED,
				state: HyperCities.config.HC_OBJECT_STATE.PUBLIC,
				parents: HyperCities.config.HC_COLLECTIONS.USER.id,
				responseType: "json",
				password: password
			};

			$("." + CLASSES.addBtn, _panelWrapper)
				.addClass(CLASSES.disabled);

			// TODO:: Add timeout handler
			$.post(URLS.addNewCollection, params, _parseNewCollection, "xml");
		} else {
			alert(HTML.noNewName);
			$("#" + IDS.newName, _panelWrapper).focus();
		}
	};

	/**
	 * Insert image into textarea (via Hyperlink)
	 * The image url is in #HCMediaLink input field
	 */
	var _insertImage = function () {

		var linkUrl = $("#" + IDS.mediaLink, _panelWrapper).val();

		if (linkUrl !== "") {
			_jHtmlarea.image(linkUrl);
			_hideMediaUploader();
		} else {
			alert(HTML.noImgLink);
		}
	};

	/**
	 * Upload Image file
	 */
	var _uploadImage = function () {

		var buttonDiv   = $("." + CLASSES.uploadMediaBtn, _panelWrapper),
			uploaderDiv = $("#" + IDS.mediaFile, _panelWrapper),
			feedbackDiv = $("." + CLASSES.feedbackBox, _panelWrapper),
			targetDiv   = $("#" + IDS.uploadTarget, _panelWrapper),
			filename    = HyperCities.util.fileFromPath(uploaderDiv.val());

		// Provide Feedback message
		feedbackDiv.empty()
			.removeClass(CLASSES.error)
			.html(HTML.uploading + filename + "...");

		// Disable upload Button
		buttonDiv.removeClass(CLASSES.hover)
			.addClass(CLASSES.disabled);
		uploaderDiv.hide();

		// Bind Feedback Event
		targetDiv.bind("load",
			function () {
				// Set a short delay so that 
				// jQuery can traverse returned message
				setTimeout(function() {
					var res = targetDiv.contents().find("body").text();
					res = window["eval"]("(" + res + ")");
					_jHtmlarea.image(res.url);
					_hideMediaUploader();
				}, 1000);
			}
		);

		// Submit Form
		$("#" + IDS.mediaForm, _panelWrapper).submit();

	};

	/**
	 * Upload KML file
	 */
	var _uploadKml = function () {

		var buttonDiv   = $("." + CLASSES.uploadKmlBtn, _panelWrapper),
			uploaderDiv = $("#" + IDS.kmlFile, _panelWrapper),
			feedbackDiv = $("." + CLASSES.feedbackBox, _panelWrapper),
			targetDiv   = $("#" + IDS.uploadTarget, _panelWrapper),
			filename    = HyperCities.util.fileFromPath(uploaderDiv.val());

		// Provide Feedback message
		feedbackDiv.empty()
			.removeClass(CLASSES.error)
			.html(HTML.uploading + filename + "...");
		
		// Disable upload Button
		buttonDiv.removeClass(CLASSES.hover)
			.addClass(CLASSES.disabled);
		uploaderDiv.hide();

		// Assign upload command
		$("#" + IDS.command, _panelWrapper).val("upload");

		// Bind Feedback Event. Unbind all handler first(in case of error).
		targetDiv.unbind().bind("load",
			function () {
				// Set a short delay so that 
				// jQuery can traverse returned message
				setTimeout(function() {
					_kmlUploaderHandler(targetDiv.contents());
				}, 1000);
			}
		);

		// Submit Form
		$("#" + IDS.contentForm, _panelWrapper).submit();
	};

	/** 
	 * Initialize File Uploader
	 * @param {Dom} the button that triger the file uploader
	 * @param {Dom} the real file input field
	 * @param {Object} ext: the accept file extension type
	 *                 callback: the function to call after file selected
	 */
	var _initUploader = function ($button, $uploader, $options) {

		var detectDiv   = $('#' + IDS.objectEditPanel, _panelWrapper),
			options     = $options || {},
			buttonDiv   = $button,
			uploaderDiv = $uploader,
			buttonBox   = buttonDiv.offset();

		buttonBox.right  = buttonBox.left + buttonDiv.outerWidth();
		buttonBox.bottom = buttonBox.top + buttonDiv.outerHeight();

		// Hide Normal file upload form
		buttonDiv.parent()
			.children("label, input").hide();

		// We cannot bind mouseover event on buttonDiv,
		// because file input field will overlay on top of it
		if (typeof detectDiv.data('events')['mouserover'] === 'undefined') {
			detectDiv.bind("mousemove",
				function ($event) {
					// Button is disabled
					if (buttonDiv.hasClass(CLASSES.disabled)) {
						uploaderDiv.hide();
						return;
					}
					// User operate on Collection panel (which over the button)
					// Only happen in KML upload mode
					if ($('.' + CLASSES.uploadKmlBtn, _panelWrapper).is(":visible") &&
						$('.' + CLASSES.collectionPanel, _panelWrapper).is(":visible")) {
						uploaderDiv.hide();
						return;
					}

					// If mouse is over the button, 
					// overlay File uploader on button
					// Otherwise, hide the button
					if (($event.pageY < buttonBox.top) ||
						($event.pageY > buttonBox.bottom) ||
						($event.pageX < buttonBox.left) ||
						($event.pageX > buttonBox.right)) {
						uploaderDiv.hide();
						buttonDiv.removeClass(CLASSES.hover);
					} else {
						if (uploaderDiv.is(":hidden")) {
							uploaderDiv.show();
							buttonDiv.addClass(CLASSES.hover);
						}
						uploaderDiv.css("top", $event.pageY - buttonBox.bottom);
						uploaderDiv.css("left", $event.pageX - buttonBox.left);
					}
				}
			);
		}

		// If File Form changes, auto Submit the file
		if (typeof uploaderDiv.data('events') === 'undefined' ||
			typeof uploaderDiv.data('events')['change'] === 'undefined') {
			uploaderDiv.bind("change",
				function () {
					// get filename from input
					var filename = HyperCities.util.fileFromPath(this.value),
						fileExt  = HyperCities.util.getExt(filename);
						errorMsg = HTML.wrongExt.join(''),
						regx     = new RegExp('^(' + options.ext + ')$','i'),
						self     = this;

					if (!(fileExt && regx.test(fileExt))) {
						errorMsg = HyperCities.util.str2Xml(errorMsg);
						_responseHandler(errorMsg);
						return false;
					}

					if (typeof(options.callback) === 'function') {
						options.callback.call(self);
					}
				}
			);
		}
	};

	/**
	 * Reset the KML file uploader
	 * Reset all field and remove overlay if there exists one
	 */
	var _resetKmlUploader = function () {

		// Enabled and reset KMLLink field
		$("#" + IDS.kmlLink, _panelWrapper)
			.val("")
			.attr("disabled", false);
		$("." + CLASSES.previewBtn, _panelWrapper)
			.removeClass(CLASSES.disabled);

		// Enabled and reset KMLFile field
		$("#" + IDS.kmlFile, _panelWrapper)
			.val("")
			.data("url", "");
		$("." + CLASSES.uploadKmlBtn, _panelWrapper)
			.removeClass(CLASSES.disabled);

		// Clean feedbackBox
		$("." + CLASSES.feedbackBox, _panelWrapper)
			.empty();

		$("#" + IDS.metaData, _panelWrapper).val("");


		// If there exist old overlay, remove it
		if (_kmlPreview !== null) {
			_removeKml();
		}
	};

	/**
	 * Initialize KML upload area
	 */
	var _initKmlUploader = function () {

		// Bind KML Link Prompt
		$("#" + IDS.kmlLink, _panelWrapper)
			.form_prompt(HTML.kmlLinkPrompt);

		if (_currentMode === HyperCities.config.MODE_ADD_OBJECT) {
			// Initiallize KML Uploader
			_initUploader($("." + CLASSES.uploadKmlBtn, _panelWrapper),
				$("#" + IDS.kmlFile, _panelWrapper),
				{ext: "kml|kmz", callback: _uploadKml}
			);
		} else { // Hide Kml Uploader Componenet, because we only edit link
			$("." + CLASSES.previewBtn, _panelWrapper)
				.nextUntil("." + CLASSES.block)
				.hide();
		}
	};

	/**
	 * Initialize jHtmlArea editor
	 */
	var _initHtmlEditor = function () {

		var contentDiv = $("#" + IDS.description, _panelWrapper);

		if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
			contentDiv.val(_objectData.content);
		}

		contentDiv.htmlarea({
			// Override/Specify the Toolbar buttons to show
			toolbar: [
				["html"],
				[{// Add a custom Toolbar Button
					css: "image",
					text: "Insert/Upload Image",
					action: _imageUploader
				}
				],
				["bold", "italic", "underline", "strikethrough", 
				"|", "subscript", "superscript"],
				["increasefontsize", "decreasefontsize"],
				["orderedlist", "unorderedlist"],
				["indent", "outdent"],
				["link", "unlink", "horizontalrule"]
			],

			// Do something once the editor has finished loading
			loaded: 
				function () { 
					$("." + CLASSES.htmlArea, _panelWrapper)
						.find("." + CLASSES.jToolBar + " a")
						.attr("tabindex", "-1");
					return false; 
				}
			}
		);

	};

	/**
	 * Initialize Editor for collection
	 */
	var _initFolderEditor = function () {

		// Initialize the plaintaxt description area
		var contentDiv = $("#" + IDS.description, _panelWrapper),
			passcode   = $("#" + IDS.passcode, _panelWrapper),
			panelHead  = $("#" + IDS.panelHead, _panelWrapper);

		if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
			contentDiv.val(_objectData.description);
			passcode.val(_objectData.password);
		}

		// Setup Other Folder Related stuff

		// hide toolbar and timespan
		//$("." + CLASSES.toolbar, _panelWrapper).hide();
		$("." + CLASSES.contentBtn, panelHead).hide();
		$("." + CLASSES.baseMapBtn, panelHead).hide();
		$("." + CLASSES.objectBtn, panelHead).hide();
		$("." + CLASSES.settingBtn, panelHead).hide();
		$("." + CLASSES.bookBtn, panelHead).hide();
		

		$("#" + IDS.time, _panelWrapper).parent().hide();

		// show password field
		$("#" + IDS.passcode, panelHead).parent().show();

		// show shareAll checkbox
		$("#" + IDS.shareAll, _panelWrapper).parent().show();
	};

	/**
	 * Update BaseMapList
	 * @param {JSON} Object that contains map information
	 */
	var _updateBaseMapList = function ($data) {

		var maps          = ($data.maps).reverse(),
			len           = maps.length,
			mapsDom       = $("." + CLASSES.baseMapList, _panelWrapper),
			currentMapDom = $("." + CLASSES.currentBaseMap, _panelWrapper),
			currentMaps   = null,
			removedMap    = null,
			currentZoom   = HyperCities.mainMap.getZoom(),
			dateFrom      = "N/A",
			currentOpen   = [],
			mapsInView    = [],
			itemDom       = null,
			listDom       = $("<div/>");

		if (!len) { // Query returns no maps
			mapsDom.empty().append("No Maps");
			// Since there's no maps in view, remove all Current BaseMap
			currentMapDom.children()
				.find("." + CLASSES.removeBaseMap)
				.trigger("click");
			return;
		}

		// Get currently selected map Id
		currentMaps = currentMapDom.children();
		currentOpen = $.map(currentMaps,
								function ($node) {
									return $($node).data("id");
								}
							);

		mapsDom.empty();

		while (len--) {
			mapsInView.push(maps[len].id);
			if (maps[len].mapping.dateFrom.date[0] == '-') {
				dateFrom = maps[len].mapping.dateFrom.date.substr(1,4)
			} 
			else {
				dateFrom = maps[len].mapping.dateFrom.date.substr(0,4)
			}
			//itemDom = $('<div>'+maps[len].title+'</div>');
			itemDom = $(HTML.mapItem.join(''));
			itemDom
				.data("id", maps[len].id)
				.attr("id", "baseMapItem_" + maps[len].id)
				.find("strong")
					.html(dateFrom)
					.end()
				.find("span")
					.html(maps[len].title)
					.attr("title", maps[len].title)
					.end()
				.click(_setBaseMap);

			// Show on MapList only if it's not currently Selected
			if ( $.inArray(maps[len].id, currentOpen) >= 0 ) {
				itemDom.hide();
			}
			listDom.append(itemDom);
			HyperCities.mapList.appendNewMap(maps[len].id, maps[len], false);
		}

		mapsDom.append(listDom.children());

		// Select BaseMap if it's not currently Selected
		$.each(HyperCities.session.get("map"),
			function () {
				if ( $.inArray(parseInt(this.id), currentOpen) < 0 ) {
					$("." + CLASSES.baseMapList, _panelWrapper)
						.find("#baseMapItem_" + this.id)
						.trigger("click");
				}
			}
		);

		// Remove BaseMap if it's not currently in View
		$.each(currentMaps,
			function () {
				var mapId = $(this).data("id");
				if ( $.inArray(mapId, mapsInView ) < 0 ) {
					$(this).find("." + CLASSES.removeBaseMap)
						.trigger("click");
				}
			}
		);

		// Add Dynamic maps (if exists)
		$.each(HyperCities.mainMap.getDynamicMaps(),
				function ($index) {
					var mapHash = HyperCities.util.MD5(this.url);

					// Check if the Dynamic map already in MapPanel
					if ( currentMapDom.find("#baseMapItem_ws_" + mapHash).length > 0 ) {
						return;
					}

					// Add it to Currrent BaseMap
					itemDom = $(HTML.mapItem.join(''));
					itemDom
						.data("id", -1)
						.data("layer", this.layers)
						.data("mapUrl", this.url)
						.attr("id", "baseMapItem_ws_" + mapHash)
						.find("strong")
							.html("WS Map")
							.end()
						.find("span")
							.html(this.url)
							.attr("title", this.url)
						.end();

					currentMapDom.prepend(itemDom);
				}
		);
		return false;
	};

	var _setBaseMap = function ($event) {

		var target = $($event.currentTarget),
			mapId  = target.data("id"),
			currentMapDom = $("." + CLASSES.currentBaseMap, _panelWrapper),
			currentMaps = null,
			removedMap  = null,
			itemDom     = null;

		HyperCities.util.debug(_id + "Select Map " + mapId);

		target.fadeOut();

		// Add it to Currrent BaseMap
		itemDom = target.clone();
		itemDom
			.removeAttr("id")
			.data("id", mapId);
		currentMapDom.prepend(itemDom);
		currentMaps = currentMapDom.children();
		if (currentMaps.length > 2) {
			removedMap = currentMapDom.children(":last");
			HyperCities.util.debug(_id + "Remove Map " + removedMap.data("id"));
			HyperCities.mapList.hideMap(removedMap.data("id"));
			$("." + CLASSES.baseMapList, _panelWrapper)
				.find("#baseMapItem_" + removedMap.data("id"))
				.show();
			removedMap.remove();
		}
		HyperCities.mapList.addMap(mapId);

		return false;
	};

	var _toggleMapToolPanel = function ($event) {
		var target     = $($event.target),
				removedMap = target.parent(),
				position   = target.offset(),
				height     = target.height(),
				OCDom      = $("." + CLASSES.baseMapOC),
				panelDom   = $("." + CLASSES.mapToolBox),
				mapId      = removedMap.data("id"),
				mapUrl     = removedMap.data("mapUrl"),
				mapLayer   = removedMap.data("layer"),
				mapObject  = {};

		if (panelDom.is(":hidden")) {
			panelDom.data("mapDom", removedMap)
				.css('top', position.top + height + 3)
				.show();

			if ( mapId == -1 ) {
				mapObject = HyperCities.mainMap.getMapByUrl(mapUrl, mapLayer);
			} else {
				mapObject = HyperCities.mapList.getMap(mapId);
			}

			OCDom.attr("id", CLASSES.baseMapOC + "_" + mapId)
				.slider("destroy");
			OCDom.slider({
					value: 100,
					slide: function(e, ui) {
						HyperCities.mainMap.refreshMap(mapObject, ui.value / 100);
					}
			});

			target.addClass(CLASSES.close);

		} else {
			panelDom.hide();

			target.removeClass(CLASSES.close);
		}
	};

	var _removeBaseMap = function ($event) {

		var target     = $($event.target),
			removedMap = target.parent().data("mapDom");

		_toggleMapToolPanel($event);
		HyperCities.util.debug(_id + "Remove Map " + removedMap.data("id"));
		if ( removedMap.data("id") == -1 ) {
			var url = removedMap.find('span').text(),
					layer = removedMap.data("layer");
			removedMap.remove();
			HyperCities.util.debug(_id + "Remove Map " + url);
			HyperCities.mainMap.removeMapByUrl(url, layer);
		} else {
			HyperCities.mapList.hideMap(removedMap.data("id"));
			$("." + CLASSES.baseMapList, _panelWrapper)
				.find("#baseMapItem_" + removedMap.data("id"))
				.show();
			removedMap.remove();
		}
		return false;
	};

	/**
	 * AJAX call to get BaseMap List in current bound
	 */
	var _getBaseMapList = function () {

		var mapBounds = HyperCities.mainMap.getBounds(),
			mapZoom   = HyperCities.mainMap.getZoom();

		$.get("getMap.php", {func: 'b', fmt: 'mhc',
				bound: '{"west":'+ mapBounds.west
					+ ', "south":' + mapBounds.south
					+ ', "east":' + mapBounds.east
					+ ', "north":' + mapBounds.north
					+ '}',
				zoom: mapZoom
			}, 
			_updateBaseMapList,
			'json'
		);
	};

	/**
	 * AJAX call to get Object List in current bound
	 */
	var _getObjectList = function () {

		var mapBounds = HyperCities.mainMap.getBounds(),
			mapZoom   = HyperCities.mainMap.getZoom(),
			timespan  = HyperCities.mainMap.getTimespan(),
			params = {func: "objectEditPanel.getCollectionList"},
			yearFrom,
			yearTo;;

		params.neLat = mapBounds.north;
		params.neLng = mapBounds.east;
		params.swLat = mapBounds.south;
		params.swLng = mapBounds.west;
		params.zoom  = mapZoom;

		if ((typeof(timespan) !== 'undefined')
			&& (timespan.min instanceof Date)
			&& (timespan.max instanceof Date)) {

			params.dateFromIsBC = 0;
			params.dateToIsBC = 0;

			yearFrom = timespan.min.getFullYear();
			yearTo   = timespan.max.getFullYear();

			// Change negative year to positive and assign BC flag
			if ( yearFrom < 0 ) {
				params.dateFromIsBC = 1;
				yearFrom = -1 * yearFrom;
			}

			if ( yearTo < 0 ) {
				params.dateToIsBC = 1;
				yearTo = -1 * yearTo;
			}

			params.dateFrom = yearFrom + timespan.min.toString("-MM-dd");
			params.dateTo   = yearTo + timespan.max.toString("-MM-dd");

			// Pad leading zero to make it four digits
			while (params.dateFrom.length < 10) {
				params.dateFrom = "0" + params.dateFrom;
			}

			while (params.dateTo.length < 10) {
				params.dateTo = "0" + params.dateTo;
			}
		} // end if, end of timespan params process

		$.post("./getCollectionList.php", params, HyperCities.collectionList.parseObjectList, "xml");
		return false;
	};


	/**
	 * Load object information from _objectData
	 */
	var _loadObjectInfo = function () {

		var objectData   = _objectData,
			panelHead    = $("#" + IDS.panelHead, _panelWrapper),
			settingPanel = $("#" + IDS.settingForm, _panelWrapper),
			startTime    = $("#" + IDS.startTime, panelHead),
			endTime      = $("#" + IDS.endTime, panelHead),
			licensePanel = $("." + CLASSES.licensePanel, panelHead),
			licenseType  = [],
			currentMap   = [];

		// Zoom to the view of current object
		//HyperCities.HCObject.panTo(_currentObjectId);
		HyperCities.HCObject.zoomTo(_currentObjectId);

		// Assigning existed value to corresponding field
		if (objectData.markerState === HyperCities.config.HC_MARKER_STATE.HIDDEN) {
			$("#" + IDS.isHidden, settingPanel)
				.attr("checked", true);
		}

		$("#" + IDS.title, panelHead)
			.val(objectData.title)
			.trigger("click");

		$("#" + IDS.author, panelHead)
			.val(objectData.creator);

        var startTimeData = HyperCities.util.parseDateTime(objectData.dateFrom),
		    endTimeData = HyperCities.util.parseDateTime(objectData.dateTo);

		startTime
			.dateEntry('setDate', startTimeData);

		endTime
			.dateEntry('setDate', endTimeData);

		// Disable Timespan in folder editor
		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.FOLDER) {
			startTime.dateEntry('disable');
			endTime.dateEntry('disable');
		}
        
		HyperCities.control.timeSlider.setTime(
			null, startTimeData, endTimeData, false, false
		);

		if (objectData.copyright) {
			licenseType = $("#" + objectData.copyright, licensePanel);
			if (licenseType.length) {
				_selectLicense(licenseType);
			}
		}

		// Add Delete Button if user has privilege
		if (HyperCities.user.hasDeletePrivilege(_currentObjectId, objectData.owner)) {
			$("." + CLASSES.toolbar, panelHead)
				.append(HTML.deleteBtn.join(''));
		}

		// KML Editor, no editing on map
		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK ||
			_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK) {
	
			HyperCities.earth.enableSync(false);
			if (typeof objectData.linkUrl === 'string') {
				$("#" + IDS.kmlLink, _panelWrapper)
					.val(objectData.linkUrl)
					.trigger("click");
			}
		} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.PLACEMARK ||
				   _objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
			// Add Overlay for editing
			//HyperCities.mainMap.getAddMediaControl().startEditing(_markerType,
			//		HyperCities.HCObject.getLatLng(_currentObjectId));
		//} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
			// Call Earth Editing Control Here
			var obj = HyperCities.earth.cloneKmlObject(_currentObjectId);
			HyperCities.earth.getEarthAddMediaCtrl().setObject(obj);
			HyperCities.earth.appendKmlObject(obj);
			HyperCities.earth.getEarthAddMediaCtrl().editObject();
		}


		// Load privilege info
		if (objectData.coauthors) {
			for (index in objectData.coauthors) {
				var coauthor = objectData.coauthors[index];
				var itemDom = $(HTML.coauthorItem.join(''));

				itemDom
					.data("id", coauthor.userId)
					.attr("id", "user_" + coauthor.userId)
					.find("strong")
					.html(coauthor.firstName + " " + coauthor.lastName)
					.end()
					.find("span")
					.html(coauthor.email)
					.end()
					.click(function() {
							$(this).remove();
							});

				$("#coauthors").append(itemDom);
			}
		}

	
		// Load rich Object
        
        // Below this "if" is code for editing rich objects. Continuing
        // produces a needless AJAX call and errors, so we exit here.
		if (_objectType === HyperCities.config.HC_OBJECT_TYPE.FOLDER) {
            return;
        }
		$.get("./provider/objects/"+_currentObjectId,
			function ($data) {
				// Handle the WebService JSON Error case.
				if ( $.isArray($data) ) {
					$data = $data[0];
				}

				// Get bookmarks 
				_bookmarks = [];
				if ($data.bookmarks && $data.bookmarks.length > 0) {
					$.each($data.bookmarks,
						function() {
							_bookmarks.push({"bookId" : this.book.id, 
								"pageNo": this.pageNo,
								"bookTitle": this.book.bookTitle,
								"bookCover": this.book.coverUrl});
						}
					);
				}

				// Get baseMap of current object
				var baseMaps = [];
				
				if ($data.maps !== undefined && $data.maps !== null) {
					baseMaps = $.map($data.maps, function($item) {
										return $item.id;
									});
				}

				// Remove all current maps, if it's not the baseMap of current object
				$.each(HyperCities.session.get("map"),
					function () {
						var mapId = parseInt(this.id);
						if ( $.inArray(mapId, baseMaps) < 0 ) {
							HyperCities.util.debug(_id + "Remove Map " + mapId);
							HyperCities.mapList.hideMap(mapId);
						}
					}
				);
				
				// Load Dynamic maps
				if ($data.maps !== undefined) {
					var len = $data.maps.length;
					for (var i = 0 ; i < len ; i++ ) {
						if ( $data.maps[i].tileType == "ArcGIS" ) {
							HyperCities.mainMap.addMapByUrl($data.maps[i].tileUrl, 'ArcGIS', $data.maps[i].opacity, {}, $data.maps[i].layers);
						} else if ($data.maps[i].tileType == "WMS") {
							HyperCities.mainMap.addMapByUrl($data.maps[i].tileUrl, 'WMS', $data.maps[i].opacity, {}, $data.maps[i].layers);
						}
					}
				}

				// Load the baseMaps of Object
				//HyperCities.mainMap.setMapType($data.mapType, false);
				HyperCities.HCObject.parseRichObject(_currentObjectId, $data);
			}
		);
	};

	// Public variables and functions
	return {

		/**
		 * Load object edit panel
		 * If current mode is not objectEdit mode, 
		 * initizlize the objectEdit mode, otherwise, reset objectEdit Panel
		 * If the collectionId is given, also load the collection info.
		 * @param {Integer} collectionId in HyperCities DB
		 * @param {Object} options for creating objectEditPanel
		 */
		load: function ($collectionId, $options) {
			// HyperCities.util.debug(_id + "[A3] Load objectEdit Panel");

			var options      = $options || {},
				collectionId = parseInt($collectionId),
				parentId     = parseInt(options.parentId),
				objectType   = options.objectType,
				markerType   = options.markerType;

			// If panel already loaded, do nothing
			if (_initialized) {
				HyperCities.util.debug(_id + "[A3] Error: Panel already load");
				return false;
			}

			// If no objectType, then it's an error
			if (isNaN(objectType)) {
				HyperCities.util.debug(_id + "[A3] Error: Invalid objectType");
				return false;
			} else {
				_objectType = objectType;
			}

			// Determine System Mode
			// If no collectionId is given, then we are adding new object
			// Otherwise, we are editing existed object
			if (isNaN(collectionId)) {
				_currentMode = HyperCities.config.MODE_ADD_OBJECT;
			} else {
				_currentObjectId = collectionId;
				_currentMode = HyperCities.config.MODE_EDIT_OBJECT;
				_objectData = options.objectData;
			}

			// Setup Panel variables
			if (!isNaN(parentId)) {
				_currentParentId = parentId;
			}
			if (!isNaN(markerType)) {
				_markerType = markerType;
			}

			_init();
			_createPanelDom();

			// Show object edit panel if it's hidden
			if (_panelWrapper.is(":hidden")) {
				_panelWrapper.fadeIn("fast", 
					HyperCities.objectEditPanel.checkResize
				);
			}

			// Setup Main Panel, load HTML Editor if it is a placemark
			// or load KML uploader if it is a networkLink
			if (_objectType === HyperCities.config.HC_OBJECT_TYPE.PLACEMARK ||
				_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
				_initHtmlEditor();
			} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK ||
				_objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK) {
				_initKmlUploader();
			} else if (_objectType === HyperCities.config.HC_OBJECT_TYPE.FOLDER) {
				_initFolderEditor();
			}

			// Load Object Info if we are editing existed object
			if (_currentMode === HyperCities.config.MODE_EDIT_OBJECT) {
				_loadObjectInfo();
			}
		}, // end of load: function ()

		/**
		 * Close object edit panel and remove the overlay on map
		 * if current content is not saved, prompt the alert message
		 * @param {function} function to call BEFORE closing the panel
		 * @returns {Boolean} return true if panel has been closed
		 */
		close: function ($callback) {
			// HyperCities.util.debug(_id + "[A3] Close objectEdit Panel");

			// If there's unsaved change, confirm before closing the panel
			if (!_isSaved) { 
				response = window.confirm(HTML.saveMessage);
			} else {
				response = true;
			}

			// OK to close the panel
			if (response) {
				if (typeof($callback) === 'function') {
					$callback.call();
				}
				_closeMainPanel();
			}

			return response;
		}, // end of close: function ()

		/**
		 * Sync the basemap and object displayed in object edit panel
		 * Only do the sync if the corresponding panel is visiable
		 */
		syncSession: function () {
			var panelDom    = null,
				panelBody   = null,
				targetPanel = null;

			if (_panelWrapper.is(":visible")) {

				panelDom    = $("#" + IDS.objectEditPanel, _panelWrapper);
				panelBody   = $("#" + IDS.panelBody, panelDom);

				// Update the baseMapList panel iff it's currently visiable
				targetPanel = $("." + CLASSES.baseMapPanel, panelBody);
				if (targetPanel.is(":visible")) {
					_getBaseMapList();
				}

				// Update the ObjectList panel iff it's currently visiable
				targetPanel = $("." + CLASSES.objectPanel, panelBody);
				if (targetPanel.is(":visible")) {
					_getObjectList();
				}
			}
		},

		removeBook: function ($bookId) {
			return _removeBook($bookId);
		},

		/**
		 * Compute CSS parameters for Narrative Panel
		 * Should be called when the size of sidebar changes
		 */
		checkResize: function () {
			// HyperCities.util.debug(_id + "[A3] CheckResize objectEdit Panel");

			var viewportHeight = $(window).height(),
				sidebarWidth   = $("#" + IDS.sidebarWrapper).width(),
				bodyHeight     = 0,
				bodyWidth      = 0,
				panelDom       = null,
				panelBody      = null,
				panelFooter    = null,
				panelEdit      = null;

			_panelWrapper.width(sidebarWidth);

			if (_panelWrapper.is(":visible")) {

				panelDom    = $("#" + IDS.objectEditPanel, _panelWrapper);
				panelBody   = $("#" + IDS.panelBody, panelDom);
				panelFooter = $("#" + IDS.panelFooter, panelDom);

				panelDom.width(sidebarWidth - 10)
					.height(viewportHeight);

				// Adjust height of panelBody
				bodyHeight = panelFooter.offset().top - panelBody.offset().top;
				bodyWidth  = panelBody.width();
				panelBody.height(bodyHeight);

				// Adjust size of Sub Panels in panelBody
				panelBody.children("div")
					.width(bodyWidth)
					.height(bodyHeight);

				// If we have textArea, adjust its size
				panelEdit = $("#" + IDS.description, panelBody);
				if (panelEdit.length) {
					panelEdit.width(bodyWidth - 22)
						.height(bodyHeight - 2);
				}

				// If we have htmlArea, adjust its size
				panelEdit = $("." + CLASSES.htmlArea, panelBody)
								.find("iFrame");
				if (panelEdit.length) {
					bodyHeight = panelFooter.offset().top - panelEdit.offset().top;
					panelEdit.width(bodyWidth - 2)
						.height(bodyHeight - 2);

					// Adjust size of contentArea in jHtmlArea
					$("#" + IDS.description, panelBody)
						.height(bodyHeight - 22);

					// Adjust size of addMedia Panel
					$("." + CLASSES.mediaPanel, _panelWrapper)
						.width(bodyWidth - 4);
				}

				// Adjust size of blocker
				$("." + CLASSES.block, _panelWrapper)
					.width(_panelWrapper.outerWidth() + 3);

				// Adjust size of addCollection Panel
				$("." + CLASSES.newCollectionPanel, _panelWrapper)
					.width(bodyWidth - 4);

				// Adjust size of BaseMap Panel
				$("." + CLASSES.baseMapList, _panelWrapper)
					.height(bodyHeight - 54);
				
				// Adjust size of Book Panel
				$("." + CLASSES.bookList, _panelWrapper)
					.height(bodyHeight - 54);
			}
		} // end of checkResize: function ()

	}; // end of public methods
}(); // end of Object

// end of file
