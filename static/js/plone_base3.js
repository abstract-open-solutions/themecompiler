<!-- Original:  Ronnie T. Moore -->
<!-- Dynamic 'fix' by: Nannette Thacker -->
function textCounter(field, countfield, maxlimit) {
  var fieldval = jq(field).attr('value');
  if (fieldval.length > maxlimit) {
      // if too long...trim it!
      jq(field).attr('value',  fieldval.substring(0, maxlimit));
      alert( 'This field is limited to ' + maxlimit + ' characters in length.' );
  }
  // update 'characters left' counter
  jq('input[name="' + countfield + '"]').attr('value', Math.max(maxlimit - fieldval.length, 0));
}

/*jslint white:false, onevar:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:true, newcap:true, immed:true, strict:false, browser:true */
/*
// jQuery multiSelect
//
// Version 1.3
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
// Visit http://abeautifulsite.net/notebook/62 for more information
//
// (Amended by Andy Richmond, Letters & Science Deans' Office, University of California, Davis)
//
// (Amended and trimmed for the Plone open source CMS by Matt Barkau, WebLion Group, PSU.edu)
//
// Usage: $('#control_id').multiSelect( arguments )
//
// Arguments:
//           noneSelected       - text to display when there are no selected items in the list
//           oneOrMoreSelected  - text to display when there are one or more selected items in the list
//                                (note: you can use % as a placeholder for the number of items selected).
//                                Use * to show a comma separated list of all selected; default = '% selected'
//
// Dependencies:  jQuery 1.2.6 or higher (http://jquery.com/)
//
// Change Log:
//
//      1.0.1   - Updated to work with jQuery 1.2.6+ (no longer requires the dimensions plugin)
//              - Changed $(this).offset() to $(this).position(), per James' and Jono's suggestions
//
//      1.0.2   - Fixed issue where dropdown doesn't scroll up/down with keyboard shortcuts
//              - Changed '$' in setTimeout to use 'jQuery' to support jQuery.noConflict
//              - Renamed from jqueryMultiSelect.* to jquery.multiSelect.* per the standard recommended at
//                http://docs.jquery.com/Plugins/Authoring (does not affect API methods)
//
//      1.1.0   - Added the ability to update the options dynamically via javascript: optionsBoxUpdate(JSON)
//              - Added a title that displays the whole comma delimited list when using oneOrMoreSelected = *
//              - Moved some of the functions to be closured to make them private
//              - Changed the way the keyboard navigation worked to more closely match how a standard dropdown works
//              - ** by Andy Richmond **
//
//      1.2.1   - Fixed bug where input text overlapped dropdown arrow in IE (i.e. when using oneOrMoreSelected = *)
//              - ** by Andy Richmond **
//
//      1.2.2   - 06 January 2010 (per http://abeautifulsite.net/blog/2008/04/jquery-multiselect )
//              - Fixed bug where the keypress stopped showing the dropdown because in jQuery 1.3.2 they changed the way ':visible' works
//              - Fixed some other bugs in the way the keyboard interface worked
//              - Changed the main textbox to an <a> tag (with 'display: inline-block') to prevent the display text from being selected/highlighted
//              - Added the ability to jump to an option by typing the first character of that option (simular to a normal drop down)
//              - ** by Andy Richmond **
//              - Added [] to make each control submit an HTML array so $.serialize() works properly
//
//      1.3     - 2010 October-November
//              - Adapted for Plone open source CMS tag selector
//              - Fixed bug related to mouse hover when using arrow keys
//              - Improved many areas of keyboard support & accessibility
//              - see https://dev.plone.org/archetypes/log/Products.Archetypes/branches/plip11017-tag-selector-rmattb/Products/Archetypes/skins/archetypes/widgets/js/keywordmultiselect.js
//              - ** by Matt Barkau **
//
// Licensing & Terms of Use
//
// This plugin is dual-licensed under the GNU General Public License and the MIT License and
// is copyright 2008 A Beautiful Site, LLC.
//
*/

// Removed a test for jQuery, since we know it is available.
(function($) {

    // render the html for a single option
    function renderOption(option, i, selectName, $container) {
        // dl, dt, & dd semantically associates selector name with values
        // label makes the text clickable, like a multiple-select
        var html = '<dd><label for="' + $container.attr('id') + '-' + i + '"><input type="checkbox" name="' + selectName + '" value="' + option.value + '" id="' + $container.attr('id') + '-' + i + '"';
        if( option.selected ) {
            html += ' checked="checked"';
        }
        html += ' />' + option.text + '</label></dd>';
        return html;
    }

    // render the html for the options/optgroups
    function renderOptions(options, selectName, $container) {
        var html = "";
        for(var i = 0; i < options.length; i++) {
            html += renderOption(options[i], i, selectName, $container);
        }
        return html;
    }


//  Plans to later modularize input and output handling,
//  for better testability, modularity, and accessibility.
//  // Handle mouse move input
//  // Handle mouse click input
//  // Handle key press input
//  // Detect navigation with mouse or non-tab keys
//  // Detect navigation with tab key
//  // Detect selection with mouse
//  // Detect selection with keyboard
//  // Handle navigation of options
//  // Handle selection of options


    // Building the actual options
    function buildOptions(options, $container) {
        var optionsBox = $(this);
        var multiSelectA = optionsBox.next('.multiSelectA');

        // Help text here is only relevant when there are many tags,
        // so putting that in documentation, rather than here.
        // "Hover and type the first letter to skip through tags."
        $(".existingTagsHelp", $container).text('');

        // generate the html for the new options
        var html = renderOptions(options, optionsBox.attr('name'), $container);
        optionsBox.html(html);

        // Format selected options
        optionsBox.each( function() {
            $(this).find('INPUT:checked').parent('LABEL').addClass('checked');
        });

        // Initialize selected options list
        updateSelected.call(optionsBox);
        var allOptions = optionsBox.find('LABEL');

        // --- Navigation with Mouse ---
        // Handle mouse hover of option, both
        // entering an option, *and*
        // mouse moving within an option.
        optionsBox.find('LABEL').mousemove( function(e) {
            // At this point, the browser is saying that the mouse moved.
            // Workaround Safari's errant reporting of mousemove
            // when the mouse hasn't moved, but background has.
            // Initialize position variables.
            if(multiSelectA.oldPositionX === null || multiSelectA.oldPositionY === null) {
                multiSelectA.oldPositionX = e.pageX;
                multiSelectA.oldPositionY = e.pageY;
            }
            if( multiSelectA.oldPositionX !== e.pageX || multiSelectA.oldPositionY !== e.pageY ) {
                // At this point, the mouse actually did move.
                // Highlight navigated option
                $(this).parent().parent().find('LABEL').removeClass('hover'); // remove all highlights
                $(this).addClass('hover'); // add the new highlight
                lastNavTabKeyCheckbox = null;
                multiSelectA.oldPositionX = e.pageX;
                multiSelectA.oldPositionY = e.pageY;
                multiSelectA.focus();
                adjustViewPort(optionsBox);
            }
        });

        // --- Selection with Mouse ---
        // Handle mouse click of checkbox
        optionsBox.find('INPUT:checkbox').click( function() {
            // set the label checked class
            $(this).parent('LABEL').toggleClass('checked', $(this).attr('checked'));

            updateSelected.call(optionsBox);
            // Highlight selected option
            // placeholder
            // Refocus
            multiSelectA.focus();
            // If this checkbox was navigated to with the tab key before being checked,
            // then put focus back on it.
            if(typeof(lastNavTabKeyCheckbox) !== "undefined" && lastNavTabKeyCheckbox !== null) {
                lastNavTabKeyCheckbox.focus();
                lastNavTabKeyCheckbox = null;
            }
        });

        // --- Navigation with Tab Key ---
        // Track mouse click of option
        optionsBox.find('LABEL').mousedown(function() {
            // Track mouse clicks,
            // so that tab key navigation focus on checkboxes can be maintained separately.
            lastNavClickTag = this;
        });
        // Handle tab-key focus of checkbox
        optionsBox.find('INPUT').focus(function() {
            if(typeof(lastNavClickTag) == "undefined" || lastNavClickTag === null) {
                // This only happens with tab key navgation.
                // Must keep track of this, because
                // mouse-driven nav always keeps *focus* on multiSelectA,
                // while the active optionsBox get *hover*.
                // Tab navigation is different - it's active option checkbox gets *focus*,
                // rather than *hover*, since keyboard navigation never hovers.
                // If the checkbox is tabbed to & checked , save it so that focus can be put back on it.
                // Without this, both moused & tabbed checks return focus to multiSelectA,
                // causing tabbed checkboxes to lose focus.
                lastNavTabKeyCheckbox = $(this);
                // Highlight navigated option
                lastNavTabKeyCheckbox.parent().parent().parent().find('LABEL').removeClass('hover');
                lastNavTabKeyCheckbox.parent('LABEL').addClass('hover');
            }
            lastNavClickTag = null;
        });

        // Handle keyboard press
        multiSelectA.keydown( function(e) {

            var optionsBox = $(this).prev('.optionsBox');

            // --- Navigation with Arrow or Page Keys ---
            // Down || Up
            if( e.keyCode == 40 || e.keyCode == 38) {
                var oldHoverIndex = allOptions.index(allOptions.filter('.hover'));
                var newHoverIndex = -1;

                // if there is no current highlighted item then highlight the first item
                if(oldHoverIndex < 0) {
                    // Default to first item
                    optionsBox.find('LABEL:first').addClass('hover');
                }
                // else if we are moving down and there is a next item then move
                else if(e.keyCode == 40 && oldHoverIndex < allOptions.length - 1) {
                    newHoverIndex = oldHoverIndex + 1;
                }
                // else if we are moving up and there is a prev item then move
                else if(e.keyCode == 38 && oldHoverIndex > 0) {
                    newHoverIndex = oldHoverIndex - 1;
                }

                if(newHoverIndex >= 0) {
                    // Highlight navigated option
                    $(allOptions).removeClass('hover'); // remove old highlights
                    $(allOptions.get(newHoverIndex)).addClass('hover'); // add the new highlight
                    lastNavTabKeyCheckbox = null;

                    // Adjust the viewport if necessary
                    adjustViewPort(optionsBox);
                }

                return false;
            }
            // Page up || Page down
            if( e.keyCode == 33 || e.keyCode == 34) {
                var oldHoverIndex = allOptions.index(allOptions.filter('.hover'));
                var newHoverIndex = -1;
                var optionsPerPage = 8;  // depends on css
                // if we are moving up and there is a prev item then move
                if(e.keyCode == 33 && oldHoverIndex > 0) {
                    newHoverIndex = oldHoverIndex - optionsPerPage;
                    if(newHoverIndex < 0) {
                        newHoverIndex = 0;
                    }
                }
                if(e.keyCode == 34 && oldHoverIndex < allOptions.length - 1) {
                    newHoverIndex = oldHoverIndex + optionsPerPage;
                    if(newHoverIndex > allOptions.length - 1) {
                        newHoverIndex = allOptions.length - 1;
                    }
                }
                // Highlight navigated option
                $(allOptions).removeClass('hover'); // remove all highlights
                $(allOptions.get(newHoverIndex)).addClass('hover'); // add the new highlight
                lastNavTabKeyCheckbox = null;
                // Adjust the viewport if necessary
                adjustViewPort(optionsBox);
                return false;
            }

            // --- Selection with Keyboard ---
            // Enter, Space
            if( e.keyCode == 13 || e.keyCode == 32 ) {
                var selectedCheckbox = optionsBox.find('LABEL.hover INPUT:checkbox');
                // Set the checkbox (and label class)
                selectedCheckbox.attr('checked', !selectedCheckbox.attr('checked')).parent('LABEL').toggleClass('checked', selectedCheckbox.attr('checked'));
                // Highlight selected option
                // placeholder
                // Refocus
                // placeholder
                updateSelected.call(optionsBox);
                return false;
            }

            // Any other standard keyboard character (try and match the first character of an option)
            if( e.keyCode >= 33 && e.keyCode <= 126 ) {
                // find the next matching item after the current hovered item
                var match = optionsBox.find('LABEL:startsWith(' + String.fromCharCode(e.keyCode) + ')');

                var currentHoverIndex = match.index(match.filter('LABEL.hover'));

                // filter the set to any items after the current hovered item
                var afterHoverMatch = match.filter(function (index) {
                    return index > currentHoverIndex;
                });

                // if there were no item after the current hovered item then try using the full search results (filtered to the first one)
                match = (afterHoverMatch.length >= 1 ? afterHoverMatch : match).filter("LABEL:first");

                if(match.length == 1) {
                    // if we found a match then move the hover
                    // Highlight navigated option
                    $(allOptions).removeClass('hover'); // remove all highlights
                    match.addClass('hover'); // add the new highlight
                    lastNavTabKeyCheckbox = null;

                    adjustViewPort(optionsBox);
                }
            }
            // Prevent enter key from submitting form
            if (e.keyCode == 13) {
                return false;
            }
        });
    }

    // Scroll the viewport div if necessary
    function adjustViewPort(optionsBox) {
        // check for and move scrollbar down, content up
        var hoverTop = optionsBox.find('LABEL.hover').position().top;
        var hoverHeight = optionsBox.find('LABEL.hover').outerHeight();
        var selectionBottom = hoverTop + hoverHeight;
        // The integer 18 is a manual approximation for typical scale,
        // since there's extra padding at the top of the div.optionsBox
        // which is not showing up anywhere quantitatively.
        // Could use improvement.
        var optionsHeight = optionsBox.outerHeight() + 18;
        var optionsScrollTop = optionsBox.scrollTop();
        if(selectionBottom > optionsHeight) {
            optionsBox.scrollTop(optionsScrollTop + selectionBottom - optionsHeight);
        }

        // check for and move scrollbar up, content down
        var hoveredTop = optionsBox.find('LABEL.hover').position().top;
        var optionsTop = optionsBox.position().top;
        optionsScrollTop = optionsBox.scrollTop();
        if(hoveredTop < optionsTop) {
            optionsBox.scrollTop(optionsScrollTop + hoveredTop - optionsTop);
        }
    }

    // Update heading with the total number of selected items
    function updateSelected() {
        var optionsBox = $(this);
        var multiSelectA = optionsBox.next('.multiSelectA');
        var i = 0;
        var display = '';
        optionsBox.find('INPUT:checkbox').not('.selectAll, .optGroup').each( function() {
            if ($(this).attr('checked')) {
                i++;
                display = display +
                '<p class="selectedTag"><span class="selectedTag">' +
                $(this).parent().text() +
                '</span></p>';
            }
            else {
                selectAll = false;
            }
        });

        var $container = optionsBox.closest('.tagsContainer');
        if( i === 0 ) {
            $(".selectedTagsHeading", $container).html( $(".noTagsSelected", $container).text() );
            $(".selectedTags", $container).text('');
        } else {
            $(".selectedTags", $container).html( display );
            $(".selectedTagsHeading", $container).html( $(".oneOrMoreTagsSelected", $container).text().replace('%', i) );
        }
    }

    $.extend($.fn, {
        multiSelect: function() {
            var $container = $(this).closest('.tagsContainer');
            // Initialize each optionsBox
            $(this).each( function() {
                var select = $(this);
                var html = '';
                // Overflow-y: auto enables the scrollbar, like a multiple-select
                html += '<div class="optionsBox" tabindex="9999" style="overflow-y: auto;"></div>';
                // Anchor originally used for dropdown.
                // Will try to remove after refactoring to be more modular and testable with QUnit,
                // although this element may need to stay to hold focus for mouse & arrow key navigation.
                html += '<a href="javascript:;" class="multiSelectA" title="enable tag selector: tag selector is currently enabled"></a>';
                // display:block makes the blank area right of the text clickable, like a multiple-select
                html += '<style type="text/css">.ArchetypesKeywordWidget label {display: block;}</style>';
                select.after(html);

                var optionsBox = select.next('.optionsBox');
                var multiSelectA = optionsBox.next('.multiSelectA');

                // Serialize the select options into json options
                var options = [];
                select.children().each( function() {
                    if( select.val() !== '' ) {
                        options.push({ text: $(this).html(), value: $(this).val(), selected: $(this).attr('selected') });
                    }
                });

                // Eliminate the original form element
                select.remove();

                // Add the id & name that was on the original select element to the new div
                optionsBox.attr("id", select.attr("id"));
                optionsBox.attr("name", select.attr("name"));

                // Build the dropdown options
                buildOptions.call(optionsBox, options, $container);

            });
        }

    });

    // add a new ":startsWith" search filter
    $.expr[":"].startsWith = function(el, i, m) {
        var search = m[3];
        if (!search) {
            return false;
        }
        return eval("/^[/s]*" + search + "/i").test($(el).text());
    };

})(jQuery);

jQuery(function(jq) {

  // Move the overlay div to be a direct child
  // of body to avoid IE7 z-index bug.
  // TODO: load this with prepOverlay to standardize this.
  jq('[id^=atrb_]').detach().appendTo("body");

  // the overlay itself
  jq('.addreference').overlay({
       onBeforeLoad: function() {
           ov = jq('div#content').data('overlay');
           // close overlay, if there is one already
           // we only allow one referencebrowser per time
           if (ov) {ov.close(); }
           var wrap = this.getOverlay().find('.overlaycontent');
           var src = this.getTrigger().attr('src');
           var srcfilter = src + ' >*';
           wrap.data('srcfilter', srcfilter);
           jq('div#content').data('overlay', this);
           resetHistory();
           wrap.load(srcfilter, function() {
               var fieldname = wrap.find('input[name=fieldName]').attr('value');
               check_referenced_items(fieldname);
               });
           },
       onLoad: function() {
           widget_id = this.getTrigger().attr('rel').substring(6);
           disablecurrentrelations(widget_id);
       }});

  // the breadcrumb-links and the links of the 'tree'-navigati        on
  jq('[id^=atrb_] a.browsesite', jq('body')[0]).live('click', function(event) {
      var target = jq(this);
      var src = target.attr('href');
      var wrap = target.parents('.overlaycontent');
      var srcfilter = src + ' >*';
      pushToHistory(wrap.data('srcfilter'));
      wrap.data('srcfilter', srcfilter);
      // the history we are constructing here is destinct from the
      // srcfilter-history. here we construct a selection-widget, which
      // is available, if the history_length-parameter is set on the widget
      // the srcfilter-history is used for storing the URLs to make the
      // 'Back'-link work.
      var newoption = '<option value="' + src + '">' +
          target.attr('rel') + '</option>';
      refreshOverlay(wrap, srcfilter, newoption);
      return false;
      });

  // the links for inserting referencens
  jq('[id^=atrb_] input.insertreference', jq('body')[0]).live('click', function(event) {
      var target = jq(this);
      var wrap = target.parents('.overlaycontent');
      var fieldname = wrap.find('input[name=fieldName]').attr('value');
      var multi = wrap.find('input[name=multiValued]').attr('value');
      var close_window = wrap.find('input[name=close_window]').attr('value');
      var tablerow = target.parent().parent();
      var title = tablerow.find('label').html();
      var uid = target.attr('rel');
      var messageId;
      var widget_id_base = 'ref_browser_';
      if (multi !== '0') {
        widget_id_base = 'ref_browser_items_';
      }
      if (this.checked === true) {
          refbrowser_setReference(widget_id_base + fieldname,
                                  uid, title, parseInt(multi));
          messageId = '#messageAdded';
          }
      else {
          refbrowser_delReference(fieldname, uid);
          messageId = '#messageRemoved';
      }
      if (close_window === '1' && multi != '1') {
          overlay = jq('div#content').data('overlay');
          overlay.close();
      } else {
          showMessage(messageId, title);
      };
      });


  // the history menu
  jq('[id^=atrb_] form#history select[name=path]', jq('body')[0]).live('change', function(event) {
      var target = jq(this);
      var wrap = target.parents('.overlaycontent');
      var src_selector = '[id^=atrb_] form#history ' +
          'select[name=path] :selected';
      var src = jq(src_selector).attr('value');
      var srcfilter = src + ' >*';
      refreshOverlay(wrap, srcfilter, '');
      return false;
      });

  // the pagination links
  jq('[id^=atrb_] div.listingBar a', jq('body')[0]).live('click', function(event) {
      var target = jq(this);
      var src = target.attr('href');
      var wrap = target.parents('.overlaycontent');
      var srcfilter = src + ' >*';
      refreshOverlay(wrap, srcfilter, '');
      return false;
      });



  function do_atref_search(event) {
      event.preventDefault();
      var target = jq(event.target);
      var src = target.parents('form').attr('action');
      var wrap = target.parents('.overlaycontent');
      var fieldname = wrap.find('input[name=fieldName]').attr('value');
      var fieldrealname = wrap.find('input[name=fieldRealName]').attr('value');
      var at_url = wrap.find('input[name=at_url]').attr('value');
      var searchvalue = encodeURI(wrap.find('input[name=searchValue]').attr('value'));
      var search_index = wrap.find('select[name=search_index]').attr('value');
      var multi = wrap.find('input[name=multiValued]').attr('value');
      var close_window = wrap.find('input[name=close_window]').attr('value');
      qs = 'searchValue=' + searchvalue;
      // if a search_index is defined (a dropdown list of selectable indexes next to the search input), we insert it to qs
      if (search_index) {
          qs += '&search_index=' + search_index;
          };
      qs += '&fieldRealName=' + fieldrealname +
        '&fieldName=' + fieldname + '&multiValued=' + multi +
        '&close_window' + close_window + '&at_url=' + at_url;
      var srcfilter = src + '?' + qs + ' >*';
      pushToHistory(wrap.data('srcfilter'));
      wrap.data('srcfilter', srcfilter);
      refreshOverlay(wrap, srcfilter, '');
      return false;
      }

  // the search form
  // // This does not catch form submission via enter in FF but does in IE
  jq('[id^=atrb_] form#search').live('submit', do_atref_search);
  //     // This catches form submission in FF
  jq('[id^=atrb_] form#search input[name=submit]',
      jq('body')[0]).live('click',do_atref_search);

  function disablecurrentrelations (widget_id) {
     jq('ul#' + widget_id + ' :input').each(
         function (intIndex) {
           uid = jq(this).attr('value');
           cb = jq('input[rel=' + uid + ']');
           cb.attr('disabled', 'disabled');
           cb.attr('checked', 'checked');
         });
  }


  // function to return a reference from the popup window back into the widget
  function refbrowser_setReference(widget_id, uid, label, multi)
  {
      var element = null,
          label_element = null,
          current_values = null,
          i = null,
          list = null,
          li = null,
          input = null,
          up_element = null,
          down_element = null,
          container = null,
          fieldname = null;
      // differentiate between the single and mulitselect widget
      // since the single widget has an extra label field.
      if (multi === 0) {
          jq('#' + widget_id).attr('value', uid);
          jq('#' + widget_id + '_label').attr('value', label);
      } else {
          // check if the item isn't already in the list
          current_values = jq('#' + widget_id + ' input');
          for (i = 0; i < current_values.length; i++) {
              if (current_values[i].value === uid) {
                  return false;
              }
          }
          // now add the new item
          var fieldname = widget_id.substr('ref_browser_items_'.length);
          list = document.getElementById(widget_id);
          // add ul-element to DOM, if it is not there
          if (list === null) {
              container = jq('#archetypes-fieldname-' + fieldname +
                             ' input + div');
              if (!container.length) {
                  // fix for Plone 3.3 collections, with a weird widget-id
                  container = jq('#archetypes-fieldname-value input + div');
              }
              container.after(
                 '<ul class="visualNoMarker" id="' + widget_id + '"></ul>');
              list = document.getElementById(widget_id);
          }
          li = document.createElement('li');
          label_element = document.createElement('label');
          input = document.createElement('input');
          input.type = 'checkbox';
          input.value = uid;
          input.checked = true;
          input.name = fieldname + ':list';
          label_element.appendChild(input);
          label_element.appendChild(document.createTextNode(' ' + label));
          li.appendChild(label_element);
          li.id = 'ref-' + fieldname + '-' + current_values.length;

          sortable = jq('input[name=' + fieldname + '-sortable]').attr('value');
          if (sortable === '1') {
            up_element = document.createElement('a');
            up_element.title = 'Move Up';
            up_element.href = '';
            up_element.innerHTML = '&#x25b2;';
            up_element.onclick = function () {
                refbrowser_moveReferenceUp(this);
                return false;
            };

            li.appendChild(up_element);

            down_element = document.createElement('a');
            down_element.title = 'Move Down';
            down_element.href = '';
            down_element.innerHTML = '&#x25bc;';
            down_element.onclick = function () {
                refbrowser_moveReferenceDown(this);
                return false;
            };

            li.appendChild(down_element);
          }
          list.appendChild(li);

          // fix on IE7 - check *after* adding to DOM
          input.checked = true;
      }
  }

  // remove the item for the uid from the reference widget
  function refbrowser_delReference(fieldname, uid) {
      var selector = 'input[value="' + uid + '"][name="' + fieldname + ':list"]',
          inputs = jq(selector);
      inputs.closest('li').remove();
  }

  // function to clear the reference field or remove items
  // from the multivalued reference list.
  function refbrowser_removeReference(widget_id, multi)
  {
      var x = null,
          element = null,
          label_element = null,
          list = null;

      if (multi) {
          list = document.getElementById(widget_id);
          for (x = list.length - 1; x >= 0; x--) {
              if (list[x].selected) {
                  list[x] = null;
              }
          }
          for (x = 0; x < list.length; x++) {
              list[x].selected = 'selected';
          }
      } else {
          jq('#' + widget_id).attr('value', "");
          jq('#' + widget_id + '_label').attr('value', "");
      }
  }

  function refbrowser_moveReferenceUp(self)
  {
      var elem = self.parentNode,
          eid = null,
          pos = null,
          widget_id = null,
          newelem = null,
          prevelem = null,
          arrows = null,
          cbs = null;
      if (elem === null) {
          return false;
      }
      eid = elem.id.split('-');
      pos = eid.pop();
      if (pos === "0") {
          return false;
      }
      widget_id = eid.pop();
      newelem = elem.cloneNode(true);

      //Fix: (IE keep the standard value)
      cbs = newelem.getElementsByTagName("input");
      if (cbs.length > 0) {
          cbs[0].checked = elem.getElementsByTagName("input")[0].checked;
      }

      prevelem = document.getElementById('ref-' + widget_id + '-' + (pos - 1));

      // up arrow
      arrows = newelem.getElementsByTagName("a");
      arrows[0].onclick = function () {
          refbrowser_moveReferenceUp(this);
          return false;
      };
      // down arrow
      arrows[1].onclick = function () {
          refbrowser_moveReferenceDown(this);
          return false;
      };

      elem.parentNode.insertBefore(newelem, prevelem);
      elem.parentNode.removeChild(elem);
      newelem.id = 'ref-' + widget_id + '-' + (pos - 1);
      prevelem.id = 'ref-' + widget_id + '-' + pos;
  }

  function refbrowser_moveReferenceDown(self)
  {
      var elem = self.parentNode,
          eid = null,
          pos = null,
          widget_id = null,
          current_values = null,
          newelem = null,
          nextelem = null,
          cbs = null,
          arrows = null;
      if (elem === null) {
          return false;
      }
      eid = elem.id.split('-');
      pos = parseInt(eid.pop(), 10);
      widget_id = eid.pop();
      current_values = jq('#ref_browser_items_' + widget_id + ' input');
      if ((pos + 1) === current_values.length) {
          return false;
      }

      newelem = elem.cloneNode(true);
      //Fix: (IE keep the standard value)
      cbs = newelem.getElementsByTagName("input");
      if (cbs.length > 0) {
          cbs[0].checked = elem.getElementsByTagName("input")[0].checked;
      }

      // up img
      arrows = newelem.getElementsByTagName("a");
      arrows[0].onclick = function () {
          refbrowser_moveReferenceUp(this);
          return false;
      };
      // down img
      arrows[1].onclick = function () {
          refbrowser_moveReferenceDown(this);
          return false;
      };

      nextelem = document.getElementById('ref-' + widget_id + '-' + (pos + 1));

      elem.parentNode.insertBefore(newelem, nextelem.nextSibling);
      elem.parentNode.removeChild(elem);
      newelem.id = 'ref-' + widget_id + '-' + (pos + 1);
      nextelem.id = 'ref-' + widget_id + '-' + pos;
  }

  function showMessage(messageId, text) {
      var template = jq(messageId).parent(),
          message_div = template.clone(),
          message = message_div.children(),
          old_message = jq('#message'),
          message_wrapper = jq('#messageWrapper');

      // insert a new, cloned message
      message_wrapper.prepend(message_div);
      message.find('dd').text(text);
      message.css({opacity: 0}).show();
      message.attr('id', 'message');

      // animate message switch and remove old message
      message_wrapper.animate({height: message.height() + 20 }, 400);
      message.fadeTo(400, 1);
      old_message.fadeTo(400, 0, function() {
          old_message.parent().remove();
      });
  };

  function submitHistoryForm() {
       var form = document.history;
       var path = form.path.options[form.path.selectedIndex].value;
       form.action = path;
       form.submit();
  }

  function pushToHistory(url) {
    var history = jq(document).data('atrb_history');
    history.push(url);
    jq(document).data('atrb_history', history);
  }

  function resetHistory() {
    jq(document).data('atrb_history', []);
  }

  function popFromHistory() {
    var history = jq(document).data('atrb_history');
    value = history.pop();
    jq(document).data('atrb_history', history);
    return value;
  }

  function refreshOverlay(wrap, srcfilter, newoption) {
      var oldhistory = jq('[id^=atrb_] form#history select');
      wrap.load(srcfilter, function() {
          jq('[id^=atrb_] form#history select').append(newoption +
                                                       oldhistory.html());
          ov = jq('div#content').data('overlay');
          widget_id = ov.getTrigger().attr('rel').substring(6);
          disablecurrentrelations(widget_id);
          var fieldname = wrap.find('input[name=fieldName]').attr('value');
          check_referenced_items(fieldname);
          });
  }

  // check all references in the overlay that are present in the widget
  function check_referenced_items(fieldname) {
      var refs_in_overlay = jq('input.insertreference'),
          uid_selector = "input[name='" + fieldname + ":list']",
          current = jq(uid_selector), // the widget in the form
          current_uids = current.map(function () {
              if (jq(this).attr('checked') === true) {
                  return jq(this).attr('value');
              }
              return null;
          });

      refs_in_overlay.each(function () {
          var overlay_ref = jq(this),
              uid = jq(overlay_ref).attr('rel'),
              i;

          for (i = 0; i < current_uids.length; i++) {
              if (uid === current_uids[i]) {
                  overlay_ref.attr('checked', true);
                  return true;  // break jq.each
              }
          }
      });
  }
});

/*  Copyright Mihai Bazon, 2002-2005  |  www.bazon.net/mishoo
 * -----------------------------------------------------------
 *
 * The DHTML Calendar, version 1.0 "It is happening again"
 *
 * Details and latest version at:
 * www.dynarch.com/projects/calendar
 *
 * This script is developed by Dynarch.com.  Visit us at www.dynarch.com.
 *
 * This script is distributed under the GNU Lesser General Public License.
 * Read the entire license text here: http://www.gnu.org/licenses/lgpl.html
 */
 Calendar=function(firstDayOfWeek,dateStr,onSelected,onClose){this.activeDiv=null;this.currentDateEl=null;this.getDateStatus=null;this.getDateToolTip=null;this.getDateText=null;this.timeout=null;this.onSelected=onSelected||null;this.onClose=onClose||null;this.dragging=false;this.hidden=false;this.minYear=1970;this.maxYear=2050;this.dateFormat=Calendar._TT["DEF_DATE_FORMAT"];this.ttDateFormat=Calendar._TT["TT_DATE_FORMAT"];this.isPopup=true;this.weekNumbers=true;this.firstDayOfWeek=typeof firstDayOfWeek=="number"?firstDayOfWeek:Calendar._FD;this.showsOtherMonths=false;this.dateStr=dateStr;this.ar_days=null;this.showsTime=false;this.time24=true;this.yearStep=2;this.hiliteToday=true;this.multiple=null;this.table=null;this.element=null;this.tbody=null;this.firstdayname=null;this.monthsCombo=null;this.yearsCombo=null;this.hilitedMonth=null;this.activeMonth=null;this.hilitedYear=null;this.activeYear=null;this.dateClicked=false;if(typeof Calendar._SDN=="undefined"){if(typeof Calendar._SDN_len=="undefined")Calendar._SDN_len=3;var ar=new Array();for(var i=8;i>0;){ar[--i]=Calendar._DN[i].substr(0,Calendar._SDN_len);}Calendar._SDN=ar;if(typeof Calendar._SMN_len=="undefined")Calendar._SMN_len=3;ar=new Array();for(var i=12;i>0;){ar[--i]=Calendar._MN[i].substr(0,Calendar._SMN_len);}Calendar._SMN=ar;}};Calendar._C=null;Calendar.is_ie=(/msie/i.test(navigator.userAgent)&&!/opera/i.test(navigator.userAgent));Calendar.is_ie5=(Calendar.is_ie&&/msie 5\.0/i.test(navigator.userAgent));Calendar.is_opera=/opera/i.test(navigator.userAgent);Calendar.is_khtml=/Konqueror|Safari|KHTML/i.test(navigator.userAgent);Calendar.getAbsolutePos=function(el){var SL=0,ST=0;var is_div=/^div$/i.test(el.tagName);if(is_div&&el.scrollLeft)SL=el.scrollLeft;if(is_div&&el.scrollTop)ST=el.scrollTop;var r={x:el.offsetLeft-SL,y:el.offsetTop-ST};if(el.offsetParent){var tmp=this.getAbsolutePos(el.offsetParent);r.x+=tmp.x;r.y+=tmp.y;}return r;};Calendar.isRelated=function(el,evt){var related=evt.relatedTarget;if(!related){var type=evt.type;if(type=="mouseover"){related=evt.fromElement;}else if(type=="mouseout"){related=evt.toElement;}}while(related){if(related==el){return true;}related=related.parentNode;}return false;};Calendar.removeClass=function(el,className){if(!(el&&el.className)){return;}var cls=el.className.split(" ");var ar=new Array();for(var i=cls.length;i>0;){if(cls[--i]!=className){ar[ar.length]=cls[i];}}el.className=ar.join(" ");};Calendar.addClass=function(el,className){Calendar.removeClass(el,className);el.className+=" "+className;};Calendar.getElement=function(ev){var f=Calendar.is_ie?window.event.srcElement:ev.currentTarget;while(f.nodeType!=1||/^div$/i.test(f.tagName))f=f.parentNode;return f;};Calendar.getTargetElement=function(ev){var f=Calendar.is_ie?window.event.srcElement:ev.target;while(f.nodeType!=1)f=f.parentNode;return f;};Calendar.stopEvent=function(ev){ev||(ev=window.event);if(Calendar.is_ie){ev.cancelBubble=true;ev.returnValue=false;}else{ev.preventDefault();ev.stopPropagation();}return false;};Calendar.addEvent=function(el,evname,func){if(el.attachEvent){el.attachEvent("on"+evname,func);}else if(el.addEventListener){el.addEventListener(evname,func,true);}else{el["on"+evname]=func;}};Calendar.removeEvent=function(el,evname,func){if(el.detachEvent){el.detachEvent("on"+evname,func);}else if(el.removeEventListener){el.removeEventListener(evname,func,true);}else{el["on"+evname]=null;}};Calendar.createElement=function(type,parent){var el=null;if(document.createElementNS){el=document.createElementNS("http://www.w3.org/1999/xhtml",type);}else{el=document.createElement(type);}if(typeof parent!="undefined"){parent.appendChild(el);}return el;};Calendar._add_evs=function(el){with(Calendar){addEvent(el,"mouseover",dayMouseOver);addEvent(el,"mousedown",dayMouseDown);addEvent(el,"mouseout",dayMouseOut);if(is_ie){addEvent(el,"dblclick",dayMouseDblClick);el.setAttribute("unselectable",true);}}};Calendar.findMonth=function(el){if(typeof el.month!="undefined"){return el;}else if(typeof el.parentNode.month!="undefined"){return el.parentNode;}return null;};Calendar.findYear=function(el){if(typeof el.year!="undefined"){return el;}else if(typeof el.parentNode.year!="undefined"){return el.parentNode;}return null;};Calendar.showMonthsCombo=function(){var cal=Calendar._C;if(!cal){return false;}var cal=cal;var cd=cal.activeDiv;var mc=cal.monthsCombo;if(cal.hilitedMonth){Calendar.removeClass(cal.hilitedMonth,"hilite");}if(cal.activeMonth){Calendar.removeClass(cal.activeMonth,"active");}var mon=cal.monthsCombo.getElementsByTagName("div")[cal.date.getMonth()];Calendar.addClass(mon,"active");cal.activeMonth=mon;var s=mc.style;s.display="block";if(cd.navtype<0)s.left=cd.offsetLeft+"px";else{var mcw=mc.offsetWidth;if(typeof mcw=="undefined")mcw=50;s.left=(cd.offsetLeft+cd.offsetWidth-mcw)+"px";}s.top=(cd.offsetTop+cd.offsetHeight)+"px";};Calendar.showYearsCombo=function(fwd){var cal=Calendar._C;if(!cal){return false;}var cal=cal;var cd=cal.activeDiv;var yc=cal.yearsCombo;if(cal.hilitedYear){Calendar.removeClass(cal.hilitedYear,"hilite");}if(cal.activeYear){Calendar.removeClass(cal.activeYear,"active");}cal.activeYear=null;var Y=cal.date.getFullYear()+(fwd?1:-1);var yr=yc.firstChild;var show=false;for(var i=12;i>0;--i){if(Y>=cal.minYear&&Y<=cal.maxYear){yr.innerHTML=Y;yr.year=Y;yr.style.display="block";show=true;}else{yr.style.display="none";}yr=yr.nextSibling;Y+=fwd?cal.yearStep:-cal.yearStep;}if(show){var s=yc.style;s.display="block";if(cd.navtype<0)s.left=cd.offsetLeft+"px";else{var ycw=yc.offsetWidth;if(typeof ycw=="undefined")ycw=50;s.left=(cd.offsetLeft+cd.offsetWidth-ycw)+"px";}s.top=(cd.offsetTop+cd.offsetHeight)+"px";}};Calendar.tableMouseUp=function(ev){var cal=Calendar._C;if(!cal){return false;}if(cal.timeout){clearTimeout(cal.timeout);}var el=cal.activeDiv;if(!el){return false;}var target=Calendar.getTargetElement(ev);ev||(ev=window.event);Calendar.removeClass(el,"active");if(target==el||target.parentNode==el){Calendar.cellClick(el,ev);}var mon=Calendar.findMonth(target);var date=null;if(mon){date=new Date(cal.date);if(mon.month!=date.getMonth()){date.setMonth(mon.month);cal.setDate(date);cal.dateClicked=false;cal.callHandler();}}else{var year=Calendar.findYear(target);if(year){date=new Date(cal.date);if(year.year!=date.getFullYear()){date.setFullYear(year.year);cal.setDate(date);cal.dateClicked=false;cal.callHandler();}}}with(Calendar){removeEvent(document,"mouseup",tableMouseUp);removeEvent(document,"mouseover",tableMouseOver);removeEvent(document,"mousemove",tableMouseOver);cal._hideCombos();_C=null;return stopEvent(ev);}};Calendar.tableMouseOver=function(ev){var cal=Calendar._C;if(!cal){return;}var el=cal.activeDiv;var target=Calendar.getTargetElement(ev);if(target==el||target.parentNode==el){Calendar.addClass(el,"hilite active");Calendar.addClass(el.parentNode,"rowhilite");}else{if(typeof el.navtype=="undefined"||(el.navtype!=50&&(el.navtype==0||Math.abs(el.navtype)>2)))Calendar.removeClass(el,"active");Calendar.removeClass(el,"hilite");Calendar.removeClass(el.parentNode,"rowhilite");}ev||(ev=window.event);if(el.navtype==50&&target!=el){var pos=Calendar.getAbsolutePos(el);var w=el.offsetWidth;var x=ev.clientX;var dx;var decrease=true;if(x>pos.x+w){dx=x-pos.x-w;decrease=false;}else dx=pos.x-x;if(dx<0)dx=0;var range=el._range;var current=el._current;var count=Math.floor(dx/10)%range.length;for(var i=range.length;--i>=0;)if(range[i]==current)break;while(count-->0)if(decrease){if(--i<0)i=range.length-1;}else if(++i>=range.length)i=0;var newval=range[i];el.innerHTML=newval;cal.onUpdateTime();}var mon=Calendar.findMonth(target);if(mon){if(mon.month!=cal.date.getMonth()){if(cal.hilitedMonth){Calendar.removeClass(cal.hilitedMonth,"hilite");}Calendar.addClass(mon,"hilite");cal.hilitedMonth=mon;}else if(cal.hilitedMonth){Calendar.removeClass(cal.hilitedMonth,"hilite");}}else{if(cal.hilitedMonth){Calendar.removeClass(cal.hilitedMonth,"hilite");}var year=Calendar.findYear(target);if(year){if(year.year!=cal.date.getFullYear()){if(cal.hilitedYear){Calendar.removeClass(cal.hilitedYear,"hilite");}Calendar.addClass(year,"hilite");cal.hilitedYear=year;}else if(cal.hilitedYear){Calendar.removeClass(cal.hilitedYear,"hilite");}}else if(cal.hilitedYear){Calendar.removeClass(cal.hilitedYear,"hilite");}}return Calendar.stopEvent(ev);};Calendar.tableMouseDown=function(ev){if(Calendar.getTargetElement(ev)==Calendar.getElement(ev)){return Calendar.stopEvent(ev);}};Calendar.calDragIt=function(ev){var cal=Calendar._C;if(!(cal&&cal.dragging)){return false;}var posX;var posY;if(Calendar.is_ie){posY=window.event.clientY+document.body.scrollTop;posX=window.event.clientX+document.body.scrollLeft;}else{posX=ev.pageX;posY=ev.pageY;}cal.hideShowCovered();var st=cal.element.style;st.left=(posX-cal.xOffs)+"px";st.top=(posY-cal.yOffs)+"px";return Calendar.stopEvent(ev);};Calendar.calDragEnd=function(ev){var cal=Calendar._C;if(!cal){return false;}cal.dragging=false;with(Calendar){removeEvent(document,"mousemove",calDragIt);removeEvent(document,"mouseup",calDragEnd);tableMouseUp(ev);}cal.hideShowCovered();};Calendar.dayMouseDown=function(ev){var el=Calendar.getElement(ev);if(el.disabled){return false;}var cal=el.calendar;cal.activeDiv=el;Calendar._C=cal;if(el.navtype!=300)with(Calendar){if(el.navtype==50){el._current=el.innerHTML;addEvent(document,"mousemove",tableMouseOver);}else addEvent(document,Calendar.is_ie5?"mousemove":"mouseover",tableMouseOver);addClass(el,"hilite active");addEvent(document,"mouseup",tableMouseUp);}else if(cal.isPopup){cal._dragStart(ev);}if(el.navtype==-1||el.navtype==1){if(cal.timeout)clearTimeout(cal.timeout);cal.timeout=setTimeout("Calendar.showMonthsCombo()",250);}else if(el.navtype==-2||el.navtype==2){if(cal.timeout)clearTimeout(cal.timeout);cal.timeout=setTimeout((el.navtype>0)?"Calendar.showYearsCombo(true)":"Calendar.showYearsCombo(false)",250);}else{cal.timeout=null;}return Calendar.stopEvent(ev);};Calendar.dayMouseDblClick=function(ev){Calendar.cellClick(Calendar.getElement(ev),ev||window.event);if(Calendar.is_ie){document.selection.empty();}};Calendar.dayMouseOver=function(ev){var el=Calendar.getElement(ev);if(Calendar.isRelated(el,ev)||Calendar._C||el.disabled){return false;}if(el.ttip){if(el.ttip.substr(0,1)=="_"){el.ttip=el.caldate.print(el.calendar.ttDateFormat)+el.ttip.substr(1);}el.calendar.tooltips.innerHTML=el.ttip;}if(el.navtype!=300){Calendar.addClass(el,"hilite");if(el.caldate){Calendar.addClass(el.parentNode,"rowhilite");}}return Calendar.stopEvent(ev);};Calendar.dayMouseOut=function(ev){with(Calendar){var el=getElement(ev);if(isRelated(el,ev)||_C||el.disabled)return false;removeClass(el,"hilite");if(el.caldate)removeClass(el.parentNode,"rowhilite");if(el.calendar)el.calendar.tooltips.innerHTML=_TT["SEL_DATE"];return stopEvent(ev);}};Calendar.cellClick=function(el,ev){var cal=el.calendar;var closing=false;var newdate=false;var date=null;if(typeof el.navtype=="undefined"){if(cal.currentDateEl){Calendar.removeClass(cal.currentDateEl,"selected");Calendar.addClass(el,"selected");closing=(cal.currentDateEl==el);if(!closing){cal.currentDateEl=el;}}cal.date.setDateOnly(el.caldate);date=cal.date;var other_month=!(cal.dateClicked=!el.otherMonth);if(!other_month&&!cal.currentDateEl)cal._toggleMultipleDate(new Date(date));else newdate=!el.disabled;if(other_month)cal._init(cal.firstDayOfWeek,date);}else{if(el.navtype==200){Calendar.removeClass(el,"hilite");cal.callCloseHandler();return;}date=new Date(cal.date);if(el.navtype==0)date.setDateOnly(new Date());cal.dateClicked=false;var year=date.getFullYear();var mon=date.getMonth();function setMonth(m){var day=date.getDate();var max=date.getMonthDays(m);if(day>max){date.setDate(max);}date.setMonth(m);};switch(el.navtype){case 400:Calendar.removeClass(el,"hilite");var text=Calendar._TT["ABOUT"];if(typeof text!="undefined"){text+=cal.showsTime?Calendar._TT["ABOUT_TIME"]:"";}else{text="Help and about box text is not translated into this language.\n"+"If you know this language and you feel generous please update\n"+"the corresponding file in \"lang\" subdir to match calendar-en.js\n"+"and send it back to <mihai_bazon@yahoo.com> to get it into the distribution  ;-)\n\n"+"Thank you!\n"+"http://dynarch.com/mishoo/calendar.epl\n";}alert(text);return;case-2:if(year>cal.minYear){date.setFullYear(year-1);}break;case-1:if(mon>0){setMonth(mon-1);}else if(year-->cal.minYear){date.setFullYear(year);setMonth(11);}break;case 1:if(mon<11){setMonth(mon+1);}else if(year<cal.maxYear){date.setFullYear(year+1);setMonth(0);}break;case 2:if(year<cal.maxYear){date.setFullYear(year+1);}break;case 100:cal.setFirstDayOfWeek(el.fdow);return;case 50:var range=el._range;var current=el.innerHTML;for(var i=range.length;--i>=0;)if(range[i]==current)break;if(ev&&ev.shiftKey){if(--i<0)i=range.length-1;}else if(++i>=range.length)i=0;var newval=range[i];el.innerHTML=newval;cal.onUpdateTime();return;case 0:if((typeof cal.getDateStatus=="function")&&cal.getDateStatus(date,date.getFullYear(),date.getMonth(),date.getDate())){return false;}break;}if(!date.equalsTo(cal.date)){cal.setDate(date);newdate=true;}else if(el.navtype==0)newdate=closing=true;}if(newdate){ev&&cal.callHandler();}if(closing){Calendar.removeClass(el,"hilite");ev&&cal.callCloseHandler();}};Calendar.prototype.create=function(_par){var parent=null;if(!_par){parent=document.getElementsByTagName("body")[0];this.isPopup=true;}else{parent=_par;this.isPopup=false;}this.date=this.dateStr?new Date(this.dateStr):new Date();var table=Calendar.createElement("table");this.table=table;table.cellSpacing=0;table.cellPadding=0;table.calendar=this;Calendar.addEvent(table,"mousedown",Calendar.tableMouseDown);var div=Calendar.createElement("div");this.element=div;div.className="calendar";if(this.isPopup){div.style.position="absolute";div.style.display="none";}div.appendChild(table);var thead=Calendar.createElement("thead",table);var cell=null;var row=null;var cal=this;var hh=function(text,cs,navtype){cell=Calendar.createElement("td",row);cell.colSpan=cs;cell.className="button";if(navtype!=0&&Math.abs(navtype)<=2)cell.className+=" nav";Calendar._add_evs(cell);cell.calendar=cal;cell.navtype=navtype;cell.innerHTML="<div unselectable='on'>"+text+"</div>";return cell;};row=Calendar.createElement("tr",thead);var title_length=6;(this.isPopup)&&--title_length;(this.weekNumbers)&&++title_length;hh("?",1,400).ttip=Calendar._TT["INFO"];this.title=hh("",title_length,300);this.title.className="title";if(this.isPopup){this.title.ttip=Calendar._TT["DRAG_TO_MOVE"];this.title.style.cursor="move";hh("&#x00d7;",1,200).ttip=Calendar._TT["CLOSE"];}row=Calendar.createElement("tr",thead);row.className="headrow";this._nav_py=hh("&#x00ab;",1,-2);this._nav_py.ttip=Calendar._TT["PREV_YEAR"];this._nav_pm=hh("&#x2039;",1,-1);this._nav_pm.ttip=Calendar._TT["PREV_MONTH"];this._nav_now=hh(Calendar._TT["TODAY"],this.weekNumbers?4:3,0);this._nav_now.ttip=Calendar._TT["GO_TODAY"];this._nav_nm=hh("&#x203a;",1,1);this._nav_nm.ttip=Calendar._TT["NEXT_MONTH"];this._nav_ny=hh("&#x00bb;",1,2);this._nav_ny.ttip=Calendar._TT["NEXT_YEAR"];row=Calendar.createElement("tr",thead);row.className="daynames";if(this.weekNumbers){cell=Calendar.createElement("td",row);cell.className="name wn";cell.innerHTML=Calendar._TT["WK"];}for(var i=7;i>0;--i){cell=Calendar.createElement("td",row);if(!i){cell.navtype=100;cell.calendar=this;Calendar._add_evs(cell);}}this.firstdayname=(this.weekNumbers)?row.firstChild.nextSibling:row.firstChild;this._displayWeekdays();var tbody=Calendar.createElement("tbody",table);this.tbody=tbody;for(i=6;i>0;--i){row=Calendar.createElement("tr",tbody);if(this.weekNumbers){cell=Calendar.createElement("td",row);}for(var j=7;j>0;--j){cell=Calendar.createElement("td",row);cell.calendar=this;Calendar._add_evs(cell);}}if(this.showsTime){row=Calendar.createElement("tr",tbody);row.className="time";cell=Calendar.createElement("td",row);cell.className="time";cell.colSpan=2;cell.innerHTML=Calendar._TT["TIME"]||"&nbsp;";cell=Calendar.createElement("td",row);cell.className="time";cell.colSpan=this.weekNumbers?4:3;(function(){function makeTimePart(className,init,range_start,range_end){var part=Calendar.createElement("span",cell);part.className=className;part.innerHTML=init;part.calendar=cal;part.ttip=Calendar._TT["TIME_PART"];part.navtype=50;part._range=[];if(typeof range_start!="number")part._range=range_start;else{for(var i=range_start;i<=range_end;++i){var txt;if(i<10&&range_end>=10)txt='0'+i;else txt=''+i;part._range[part._range.length]=txt;}}Calendar._add_evs(part);return part;};var hrs=cal.date.getHours();var mins=cal.date.getMinutes();var t12=!cal.time24;var pm=(hrs>12);if(t12&&pm)hrs-=12;var H=makeTimePart("hour",hrs,t12?1:0,t12?12:23);var span=Calendar.createElement("span",cell);span.innerHTML=":";span.className="colon";var M=makeTimePart("minute",mins,0,59);var AP=null;cell=Calendar.createElement("td",row);cell.className="time";cell.colSpan=2;if(t12)AP=makeTimePart("ampm",pm?"pm":"am",["am","pm"]);else cell.innerHTML="&nbsp;";cal.onSetTime=function(){var pm,hrs=this.date.getHours(),mins=this.date.getMinutes();if(t12){pm=(hrs>=12);if(pm)hrs-=12;if(hrs==0)hrs=12;AP.innerHTML=pm?"pm":"am";}H.innerHTML=(hrs<10)?("0"+hrs):hrs;M.innerHTML=(mins<10)?("0"+mins):mins;};cal.onUpdateTime=function(){var date=this.date;var h=parseInt(H.innerHTML,10);if(t12){if(/pm/i.test(AP.innerHTML)&&h<12)h+=12;else if(/am/i.test(AP.innerHTML)&&h==12)h=0;}var d=date.getDate();var m=date.getMonth();var y=date.getFullYear();date.setHours(h);date.setMinutes(parseInt(M.innerHTML,10));date.setFullYear(y);date.setMonth(m);date.setDate(d);this.dateClicked=false;this.callHandler();};})();}else{this.onSetTime=this.onUpdateTime=function(){};}var tfoot=Calendar.createElement("tfoot",table);row=Calendar.createElement("tr",tfoot);row.className="footrow";cell=hh(Calendar._TT["SEL_DATE"],this.weekNumbers?8:7,300);cell.className="ttip";if(this.isPopup){cell.ttip=Calendar._TT["DRAG_TO_MOVE"];cell.style.cursor="move";}this.tooltips=cell;div=Calendar.createElement("div",this.element);this.monthsCombo=div;div.className="combo";for(i=0;i<Calendar._MN.length;++i){var mn=Calendar.createElement("div");mn.className=Calendar.is_ie?"label-IEfix":"label";mn.month=i;mn.innerHTML=Calendar._SMN[i];div.appendChild(mn);}div=Calendar.createElement("div",this.element);this.yearsCombo=div;div.className="combo";for(i=12;i>0;--i){var yr=Calendar.createElement("div");yr.className=Calendar.is_ie?"label-IEfix":"label";div.appendChild(yr);}this._init(this.firstDayOfWeek,this.date);parent.appendChild(this.element);};Calendar._keyEvent=function(ev){var cal=window._dynarch_popupCalendar;if(!cal||cal.multiple)return false;(Calendar.is_ie)&&(ev=window.event);var act=(Calendar.is_ie||ev.type=="keypress"),K=ev.keyCode;if(ev.ctrlKey){switch(K){case 37:act&&Calendar.cellClick(cal._nav_pm);break;case 38:act&&Calendar.cellClick(cal._nav_py);break;case 39:act&&Calendar.cellClick(cal._nav_nm);break;case 40:act&&Calendar.cellClick(cal._nav_ny);break;default:return false;}}else switch(K){case 32:Calendar.cellClick(cal._nav_now);break;case 27:act&&cal.callCloseHandler();break;case 37:case 38:case 39:case 40:if(act){var prev,x,y,ne,el,step;prev=K==37||K==38;step=(K==37||K==39)?1:7;function setVars(){el=cal.currentDateEl;var p=el.pos;x=p&15;y=p>>4;ne=cal.ar_days[y][x];};setVars();function prevMonth(){var date=new Date(cal.date);date.setDate(date.getDate()-step);cal.setDate(date);};function nextMonth(){var date=new Date(cal.date);date.setDate(date.getDate()+step);cal.setDate(date);};while(1){switch(K){case 37:if(--x>=0)ne=cal.ar_days[y][x];else{x=6;K=38;continue;}break;case 38:if(--y>=0)ne=cal.ar_days[y][x];else{prevMonth();setVars();}break;case 39:if(++x<7)ne=cal.ar_days[y][x];else{x=0;K=40;continue;}break;case 40:if(++y<cal.ar_days.length)ne=cal.ar_days[y][x];else{nextMonth();setVars();}break;}break;}if(ne){if(!ne.disabled)Calendar.cellClick(ne);else if(prev)prevMonth();else nextMonth();}}break;case 13:if(act)Calendar.cellClick(cal.currentDateEl,ev);break;default:return false;}return Calendar.stopEvent(ev);};Calendar.prototype._init=function(firstDayOfWeek,date){var today=new Date(),TY=today.getFullYear(),TM=today.getMonth(),TD=today.getDate();this.table.style.visibility="hidden";var year=date.getFullYear();if(year<this.minYear){year=this.minYear;date.setFullYear(year);}else if(year>this.maxYear){year=this.maxYear;date.setFullYear(year);}this.firstDayOfWeek=firstDayOfWeek;this.date=new Date(date);var month=date.getMonth();var mday=date.getDate();var no_days=date.getMonthDays();date.setDate(1);var day1=(date.getDay()-this.firstDayOfWeek)%7;if(day1<0)day1+=7;date.setDate(-day1);date.setDate(date.getDate()+1);var row=this.tbody.firstChild;var MN=Calendar._SMN[month];var ar_days=this.ar_days=new Array();var weekend=Calendar._TT["WEEKEND"];var dates=this.multiple?(this.datesCells={}):null;for(var i=0;i<6;++i,row=row.nextSibling){var cell=row.firstChild;if(this.weekNumbers){cell.className="day wn";cell.innerHTML=date.getWeekNumber();cell=cell.nextSibling;}row.className="daysrow";var hasdays=false,iday,dpos=ar_days[i]=[];for(var j=0;j<7;++j,cell=cell.nextSibling,date.setDate(iday+1)){iday=date.getDate();var wday=date.getDay();cell.className="day";cell.pos=i<<4|j;dpos[j]=cell;var current_month=(date.getMonth()==month);if(!current_month){if(this.showsOtherMonths){cell.className+=" othermonth";cell.otherMonth=true;}else{cell.className="emptycell";cell.innerHTML="&nbsp;";cell.disabled=true;continue;}}else{cell.otherMonth=false;hasdays=true;}cell.disabled=false;cell.innerHTML=this.getDateText?this.getDateText(date,iday):iday;if(dates)dates[date.print("%Y%m%d")]=cell;if(this.getDateStatus){var status=this.getDateStatus(date,year,month,iday);if(this.getDateToolTip){var toolTip=this.getDateToolTip(date,year,month,iday);if(toolTip)cell.title=toolTip;}if(status===true){cell.className+=" disabled";cell.disabled=true;}else{if(/disabled/i.test(status))cell.disabled=true;cell.className+=" "+status;}}if(!cell.disabled){cell.caldate=new Date(date);cell.ttip="_";if(!this.multiple&&current_month&&iday==mday&&this.hiliteToday){cell.className+=" selected";this.currentDateEl=cell;}if(date.getFullYear()==TY&&date.getMonth()==TM&&iday==TD){cell.className+=" today";cell.ttip+=Calendar._TT["PART_TODAY"];}if(weekend.indexOf(wday.toString())!=-1)cell.className+=cell.otherMonth?" oweekend":" weekend";}}if(!(hasdays||this.showsOtherMonths))row.className="emptyrow";}this.title.innerHTML=Calendar._MN[month]+", "+year;this.onSetTime();this.table.style.visibility="visible";this._initMultipleDates();};Calendar.prototype._initMultipleDates=function(){if(this.multiple){for(var i in this.multiple){var cell=this.datesCells[i];var d=this.multiple[i];if(!d)continue;if(cell)cell.className+=" selected";}}};Calendar.prototype._toggleMultipleDate=function(date){if(this.multiple){var ds=date.print("%Y%m%d");var cell=this.datesCells[ds];if(cell){var d=this.multiple[ds];if(!d){Calendar.addClass(cell,"selected");this.multiple[ds]=date;}else{Calendar.removeClass(cell,"selected");delete this.multiple[ds];}}}};Calendar.prototype.setDateToolTipHandler=function(unaryFunction){this.getDateToolTip=unaryFunction;};Calendar.prototype.setDate=function(date){if(!date.equalsTo(this.date)){this._init(this.firstDayOfWeek,date);}};Calendar.prototype.refresh=function(){this._init(this.firstDayOfWeek,this.date);};Calendar.prototype.setFirstDayOfWeek=function(firstDayOfWeek){this._init(firstDayOfWeek,this.date);this._displayWeekdays();};Calendar.prototype.setDateStatusHandler=Calendar.prototype.setDisabledHandler=function(unaryFunction){this.getDateStatus=unaryFunction;};Calendar.prototype.setRange=function(a,z){this.minYear=a;this.maxYear=z;};Calendar.prototype.callHandler=function(){if(this.onSelected){this.onSelected(this,this.date.print(this.dateFormat));}};Calendar.prototype.callCloseHandler=function(){if(this.onClose){this.onClose(this);}this.hideShowCovered();};Calendar.prototype.destroy=function(){var el=this.element.parentNode;el.removeChild(this.element);Calendar._C=null;window._dynarch_popupCalendar=null;};Calendar.prototype.reparent=function(new_parent){var el=this.element;el.parentNode.removeChild(el);new_parent.appendChild(el);};Calendar._checkCalendar=function(ev){var calendar=window._dynarch_popupCalendar;if(!calendar){return false;}var el=Calendar.is_ie?Calendar.getElement(ev):Calendar.getTargetElement(ev);for(;el!=null&&el!=calendar.element;el=el.parentNode);if(el==null){window._dynarch_popupCalendar.callCloseHandler();return Calendar.stopEvent(ev);}};Calendar.prototype.show=function(){var rows=this.table.getElementsByTagName("tr");for(var i=rows.length;i>0;){var row=rows[--i];Calendar.removeClass(row,"rowhilite");var cells=row.getElementsByTagName("td");for(var j=cells.length;j>0;){var cell=cells[--j];Calendar.removeClass(cell,"hilite");Calendar.removeClass(cell,"active");}}this.element.style.display="block";this.hidden=false;if(this.isPopup){window._dynarch_popupCalendar=this;Calendar.addEvent(document,"keydown",Calendar._keyEvent);Calendar.addEvent(document,"keypress",Calendar._keyEvent);Calendar.addEvent(document,"mousedown",Calendar._checkCalendar);}this.hideShowCovered();};Calendar.prototype.hide=function(){if(this.isPopup){Calendar.removeEvent(document,"keydown",Calendar._keyEvent);Calendar.removeEvent(document,"keypress",Calendar._keyEvent);Calendar.removeEvent(document,"mousedown",Calendar._checkCalendar);}this.element.style.display="none";this.hidden=true;this.hideShowCovered();};Calendar.prototype.showAt=function(x,y){var s=this.element.style;s.left=x+"px";s.top=y+"px";this.show();};Calendar.prototype.showAtElement=function(el,opts){var self=this;var p=Calendar.getAbsolutePos(el);if(!opts||typeof opts!="string"){this.showAt(p.x,p.y+el.offsetHeight+2);return true;}function fixPosition(box){if(box.x<0)box.x=0;if(box.y<0)box.y=0;var cp=document.createElement("div");var s=cp.style;s.position="absolute";s.right=s.bottom=s.width=s.height="0px";document.body.appendChild(cp);var br=Calendar.getAbsolutePos(cp);document.body.removeChild(cp);if(Calendar.is_ie){br.y+=document.body.scrollTop;br.x+=document.body.scrollLeft;}else{br.y+=window.scrollY;br.x+=window.scrollX;}var tmp=box.x+box.width-br.x;if(tmp>0)box.x-=tmp;tmp=box.y+box.height-br.y;if(tmp>0)box.y-=tmp;};this.element.style.display="block";Calendar.continuation_for_the_fucking_khtml_browser=function(){var w=self.element.offsetWidth;var h=self.element.offsetHeight;self.element.style.display="none";var valign=opts.substr(0,1);var halign="l";if(opts.length>1){halign=opts.substr(1,1);}switch(valign){case "T":p.y-=h;break;case "B":p.y+=el.offsetHeight;break;case "C":p.y+=(el.offsetHeight-h)/2;break;case "t":p.y+=el.offsetHeight-h;break;case "b":break;}switch(halign){case "L":p.x-=w;break;case "R":p.x+=el.offsetWidth;break;case "C":p.x+=(el.offsetWidth-w)/2;break;case "l":p.x+=el.offsetWidth-w;break;case "r":break;}p.width=w;p.height=h+40;self.monthsCombo.style.display="none";fixPosition(p);self.showAt(p.x,p.y);};if(Calendar.is_khtml)setTimeout("Calendar.continuation_for_the_fucking_khtml_browser()",10);else Calendar.continuation_for_the_fucking_khtml_browser();};Calendar.prototype.setDateFormat=function(str){this.dateFormat=str;};Calendar.prototype.setTtDateFormat=function(str){this.ttDateFormat=str;};Calendar.prototype.parseDate=function(str,fmt){if(!fmt)fmt=this.dateFormat;this.setDate(Date.parseDate(str,fmt));};Calendar.prototype.hideShowCovered=function(){if(!Calendar.is_ie&&!Calendar.is_opera)return;function getVisib(obj){var value=obj.style.visibility;if(!value){if(document.defaultView&&typeof(document.defaultView.getComputedStyle)=="function"){if(!Calendar.is_khtml)value=document.defaultView. getComputedStyle(obj,"").getPropertyValue("visibility");else value='';}else if(obj.currentStyle){value=obj.currentStyle.visibility;}else value='';}return value;};var tags=new Array("applet","iframe","select");var el=this.element;var p=Calendar.getAbsolutePos(el);var EX1=p.x;var EX2=el.offsetWidth+EX1;var EY1=p.y;var EY2=el.offsetHeight+EY1;for(var k=tags.length;k>0;){var ar=document.getElementsByTagName(tags[--k]);var cc=null;for(var i=ar.length;i>0;){cc=ar[--i];p=Calendar.getAbsolutePos(cc);var CX1=p.x;var CX2=cc.offsetWidth+CX1;var CY1=p.y;var CY2=cc.offsetHeight+CY1;if(this.hidden||(CX1>EX2)||(CX2<EX1)||(CY1>EY2)||(CY2<EY1)){if(!cc.__msh_save_visibility){cc.__msh_save_visibility=getVisib(cc);}cc.style.visibility=cc.__msh_save_visibility;}else{if(!cc.__msh_save_visibility){cc.__msh_save_visibility=getVisib(cc);}cc.style.visibility="hidden";}}}};Calendar.prototype._displayWeekdays=function(){var fdow=this.firstDayOfWeek;var cell=this.firstdayname;var weekend=Calendar._TT["WEEKEND"];for(var i=0;i<7;++i){cell.className="day name";var realday=(i+fdow)%7;if(i){cell.ttip=Calendar._TT["DAY_FIRST"].replace("%s",Calendar._DN[realday]);cell.navtype=100;cell.calendar=this;cell.fdow=realday;Calendar._add_evs(cell);}if(weekend.indexOf(realday.toString())!=-1){Calendar.addClass(cell,"weekend");}cell.innerHTML=Calendar._SDN[(i+fdow)%7];cell=cell.nextSibling;}};Calendar.prototype._hideCombos=function(){this.monthsCombo.style.display="none";this.yearsCombo.style.display="none";};Calendar.prototype._dragStart=function(ev){if(this.dragging){return;}this.dragging=true;var posX;var posY;if(Calendar.is_ie){posY=window.event.clientY+document.body.scrollTop;posX=window.event.clientX+document.body.scrollLeft;}else{posY=ev.clientY+window.scrollY;posX=ev.clientX+window.scrollX;}var st=this.element.style;this.xOffs=posX-parseInt(st.left);this.yOffs=posY-parseInt(st.top);with(Calendar){addEvent(document,"mousemove",calDragIt);addEvent(document,"mouseup",calDragEnd);}};Date._MD=new Array(31,28,31,30,31,30,31,31,30,31,30,31);Date.SECOND=1000;Date.MINUTE=60*Date.SECOND;Date.HOUR=60*Date.MINUTE;Date.DAY=24*Date.HOUR;Date.WEEK=7*Date.DAY;Date.parseDate=function(str,fmt){var today=new Date();var y=0;var m=-1;var d=0;var a=str.split(/\W+/);var b=fmt.match(/%./g);var i=0,j=0;var hr=0;var min=0;for(i=0;i<a.length;++i){if(!a[i])continue;switch(b[i]){case "%d":case "%e":d=parseInt(a[i],10);break;case "%m":m=parseInt(a[i],10)-1;break;case "%Y":case "%y":y=parseInt(a[i],10);(y<100)&&(y+=(y>29)?1900:2000);break;case "%b":case "%B":for(j=0;j<12;++j){if(Calendar._MN[j].substr(0,a[i].length).toLowerCase()==a[i].toLowerCase()){m=j;break;}}break;case "%H":case "%I":case "%k":case "%l":hr=parseInt(a[i],10);break;case "%P":case "%p":if(/pm/i.test(a[i])&&hr<12)hr+=12;else if(/am/i.test(a[i])&&hr>=12)hr-=12;break;case "%M":min=parseInt(a[i],10);break;}}if(isNaN(y))y=today.getFullYear();if(isNaN(m))m=today.getMonth();if(isNaN(d))d=today.getDate();if(isNaN(hr))hr=today.getHours();if(isNaN(min))min=today.getMinutes();if(y!=0&&m!=-1&&d!=0)return new Date(y,m,d,hr,min,0);y=0;m=-1;d=0;for(i=0;i<a.length;++i){if(a[i].search(/[a-zA-Z]+/)!=-1){var t=-1;for(j=0;j<12;++j){if(Calendar._MN[j].substr(0,a[i].length).toLowerCase()==a[i].toLowerCase()){t=j;break;}}if(t!=-1){if(m!=-1){d=m+1;}m=t;}}else if(parseInt(a[i],10)<=12&&m==-1){m=a[i]-1;}else if(parseInt(a[i],10)>31&&y==0){y=parseInt(a[i],10);(y<100)&&(y+=(y>29)?1900:2000);}else if(d==0){d=a[i];}}if(y==0)y=today.getFullYear();if(m!=-1&&d!=0)return new Date(y,m,d,hr,min,0);return today;};Date.prototype.getMonthDays=function(month){var year=this.getFullYear();if(typeof month=="undefined"){month=this.getMonth();}if(((0==(year%4))&&((0!=(year%100))||(0==(year%400))))&&month==1){return 29;}else{return Date._MD[month];}};Date.prototype.getDayOfYear=function(){var now=new Date(this.getFullYear(),this.getMonth(),this.getDate(),0,0,0);var then=new Date(this.getFullYear(),0,0,0,0,0);var time=now-then;return Math.floor(time/Date.DAY);};Date.prototype.getWeekNumber=function(){var d=new Date(this.getFullYear(),this.getMonth(),this.getDate(),0,0,0);var DoW=d.getDay();d.setDate(d.getDate()-(DoW+6)%7+3);var ms=d.valueOf();d.setMonth(0);d.setDate(4);return Math.round((ms-d.valueOf())/(7*864e5))+1;};Date.prototype.equalsTo=function(date){return((this.getFullYear()==date.getFullYear())&&(this.getMonth()==date.getMonth())&&(this.getDate()==date.getDate())&&(this.getHours()==date.getHours())&&(this.getMinutes()==date.getMinutes()));};Date.prototype.setDateOnly=function(date){var tmp=new Date(date);this.setDate(1);this.setFullYear(tmp.getFullYear());this.setMonth(tmp.getMonth());this.setDate(tmp.getDate());};Date.prototype.print=function(str){var m=this.getMonth();var d=this.getDate();var y=this.getFullYear();var wn=this.getWeekNumber();var w=this.getDay();var s={};var hr=this.getHours();var pm=(hr>=12);var ir=(pm)?(hr-12):hr;var dy=this.getDayOfYear();if(ir==0)ir=12;var min=this.getMinutes();var sec=this.getSeconds();s["%a"]=Calendar._SDN[w];s["%A"]=Calendar._DN[w];s["%b"]=Calendar._SMN[m];s["%B"]=Calendar._MN[m];s["%C"]=1+Math.floor(y/100);s["%d"]=(d<10)?("0"+d):d;s["%e"]=d;s["%H"]=(hr<10)?("0"+hr):hr;s["%I"]=(ir<10)?("0"+ir):ir;s["%j"]=(dy<100)?((dy<10)?("00"+dy):("0"+dy)):dy;s["%k"]=hr;s["%l"]=ir;s["%m"]=(m<9)?("0"+(1+m)):(1+m);s["%M"]=(min<10)?("0"+min):min;s["%n"]="\n";s["%p"]=pm?"PM":"AM";s["%P"]=pm?"pm":"am";s["%s"]=Math.floor(this.getTime()/1000);s["%S"]=(sec<10)?("0"+sec):sec;s["%t"]="\t";s["%U"]=s["%W"]=s["%V"]=(wn<10)?("0"+wn):wn;s["%u"]=w+1;s["%w"]=w;s["%y"]=(''+y).substr(2,2);s["%Y"]=y;s["%%"]="%";var re=/%./g;if(!Calendar.is_ie5&&!Calendar.is_khtml)return str.replace(re,function(par){return s[par]||par;});var a=str.match(re);for(var i=0;i<a.length;i++){var tmp=s[a[i]];if(tmp){re=new RegExp(a[i],'g');str=str.replace(re,tmp);}}return str;};Date.prototype.__msh_oldSetFullYear=Date.prototype.setFullYear;Date.prototype.setFullYear=function(y){var d=new Date(this);d.__msh_oldSetFullYear(y);if(d.getMonth()!=this.getMonth())this.setDate(28);this.__msh_oldSetFullYear(y);};window._dynarch_popupCalendar=null;
// ** I18N

// Calendar EN language
// Author: Mihai Bazon, <mihai_bazon@yahoo.com>
// Encoding: any
// Distributed under the same terms as the calendar itself.

// For translators: please use UTF-8 if possible.  We strongly believe that
// Unicode is the answer to a real internationalized world.  Also please
// include your contact information in the header, as can be seen above.

// full day names
Calendar._DN = new Array
("Sunday",
 "Monday",
 "Tuesday",
 "Wednesday",
 "Thursday",
 "Friday",
 "Saturday",
 "Sunday");

// Please note that the following array of short day names (and the same goes
// for short month names, _SMN) isn't absolutely necessary.  We give it here
// for exemplification on how one can customize the short day names, but if
// they are simply the first N letters of the full name you can simply say:
//
//   Calendar._SDN_len = N; // short day name length
//   Calendar._SMN_len = N; // short month name length
//
// If N = 3 then this is not needed either since we assume a value of 3 if not
// present, to be compatible with translation files that were written before
// this feature.

// short day names
Calendar._SDN = new Array
("Sun",
 "Mon",
 "Tue",
 "Wed",
 "Thu",
 "Fri",
 "Sat",
 "Sun");

// First day of the week. "0" means display Sunday first, "1" means display
// Monday first, etc.
Calendar._FD = 0;

// full month names
Calendar._MN = new Array
("January",
 "February",
 "March",
 "April",
 "May",
 "June",
 "July",
 "August",
 "September",
 "October",
 "November",
 "December");

// short month names
Calendar._SMN = new Array
("Jan",
 "Feb",
 "Mar",
 "Apr",
 "May",
 "Jun",
 "Jul",
 "Aug",
 "Sep",
 "Oct",
 "Nov",
 "Dec");

// tooltips
Calendar._TT = {};
Calendar._TT["INFO"] = "About the calendar";

Calendar._TT["ABOUT"] =
"DHTML Date/Time Selector\n" +
"(c) dynarch.com 2002-2005 / Author: Mihai Bazon\n" + // don't translate this this ;-)
"For latest version visit: http://www.dynarch.com/projects/calendar/\n" +
"Distributed under GNU LGPL.  See http://gnu.org/licenses/lgpl.html for details." +
"\n\n" +
"Date selection:\n" +
"- Use the \xab, \xbb buttons to select year\n" +
"- Use the " + String.fromCharCode(0x2039) + ", " + String.fromCharCode(0x203a) + " buttons to select month\n" +
"- Hold mouse button on any of the above buttons for faster selection.";
Calendar._TT["ABOUT_TIME"] = "\n\n" +
"Time selection:\n" +
"- Click on any of the time parts to increase it\n" +
"- or Shift-click to decrease it\n" +
"- or click and drag for faster selection.";

Calendar._TT["PREV_YEAR"] = "Prev. year (hold for menu)";
Calendar._TT["PREV_MONTH"] = "Prev. month (hold for menu)";
Calendar._TT["GO_TODAY"] = "Go Today";
Calendar._TT["NEXT_MONTH"] = "Next month (hold for menu)";
Calendar._TT["NEXT_YEAR"] = "Next year (hold for menu)";
Calendar._TT["SEL_DATE"] = "Select date";
Calendar._TT["DRAG_TO_MOVE"] = "Drag to move";
Calendar._TT["PART_TODAY"] = " (today)";

// the following is to inform that "%s" is to be the first day of week
// %s will be replaced with the day name.
Calendar._TT["DAY_FIRST"] = "Display %s first";

// This may be locale-dependent.  It specifies the week-end days, as an array
// of comma-separated numbers.  The numbers are from 0 to 6: 0 means Sunday, 1
// means Monday, etc.
Calendar._TT["WEEKEND"] = "0,6";

Calendar._TT["CLOSE"] = "Close";
Calendar._TT["TODAY"] = "Today";
Calendar._TT["TIME_PART"] = "(Shift-)Click or drag to change value";

// date formats
Calendar._TT["DEF_DATE_FORMAT"] = "%Y-%m-%d";
Calendar._TT["TT_DATE_FORMAT"] = "%a, %b %e";

Calendar._TT["WK"] = "wk";
Calendar._TT["TIME"] = "Time:";
