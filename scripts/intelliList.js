// vim: sw=4:ts=4:nu:nospell

/**
 * HyperCities intelliList Objects
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2008-12-22
 * @version   0.7
 *
 */
 
HyperCities.intelliList = function() {
    // do NOT access javascript generated DOM from here; elements don't exist yet
    
    // Private variable goes here
    var _id         = "[HyperCities.intelliList] ";
    var _animation  = false;

    // Private method goes here

    return {
        reset : function() {

            var listDiv = $(document.createElement("div"));
            listDiv.attr("id","intelliList");

            $('#intelliListWrapper').empty().append(listDiv);
        },
        
        render: function($sequence){

            HyperCities.debug(_id + "Render List Items");
            $("#intelliList").children(":last").css("margin", "0");
            $('#intelliList').jScrollPane();
            $sequence.hide();

            var div = 0;

            if ( _animation ) {
                // FadeIn Items one by one
                (function(){
                    if ( div < $sequence.length ) 
                        $($sequence[div++]).fadeIn("fast", arguments.callee);
                    else
                        $("#loadingMessage").fadeOut("slow");
                })();
            } else {
                // FadeIn all Items once
                $sequence.fadeIn("fast", function() {
                            $("#loadingMessage").fadeOut("slow"); 
                        });
            }
        },

        toggleIntelliText : function () {

            var ellipsis    = $(this).children("b");
            var toggleLink  = $(this).children("a");
            var itemText    = $(this).prev();

            toggleLink.blur();

            if ( itemText.hasClass("expand") ) { // Fold itemText
                itemText.removeClass("expand");
                toggleLink.html("more info");
                ellipsis.html("...");
            } else {                             // Unfold itemText
                itemText.addClass("expand");
                toggleLink.html("less info");
                ellipsis.empty();
            }

            $('#intelliList').jScrollPane();
            return false;
        }
    };
}(); // end of Object

// end of file
