var shortcodesComplete = false;
var linksComplete = false;
var shortcodeElements;
var count = 0;
var modalCount = 0;
var countGoal = 0;
var shortcodesLength;
var start, end, time;
var initialHeight, endHeight;
var linkHeight;
var modals = [];


function Shortcodes() {

	//apply a class to all shortcodes so they're hidden, and have appropriate height
	function hideShortcodes() {

		console.log('hideShortcodes');

		shortcodeElements = $(".wysiwyg p:contains('[[')");

		//add a class to hide shortcode text and display a placeholder container
		shortcodeElements.addClass('shortcode-building');

		//dynamically set the height of the shortcodes(only needed if loading is crazy slow)		
		//shortcodeElements.height(computeShortcodeHeight());

	}


	//set up the shortcodes process
	function initialize() {

		console.log('💩 💩 💩 SHORTCODES INITIALIZE 💩 💩 💩');

		//get a timestamp at the beginning of the process
		start = new Date().getTime();

		//get the height of the document at the beginning of the process
		initialHeight = $(document).height();

		//bind general events for media items
		bindMedia();

		if (!shortcodesComplete) {

			//get total number of shortcodes
			shortcodesLength = shortcodeElements.length;
			console.log('shortcodesLength: ' + shortcodesLength);

			//set a goal percentage of how many shortcodes should be completely executed before displaying the page
			countGoal = (Math.floor(shortcodesLength / 2));
			//console.log('countGoal: ' + countGoal);

			//process each shortcode
			if (shortcodesLength !== 0) {
				shortcodeElements.each(function (i) {

					//get the html string for the shortcode element
					shortcode = $(this).html();
					//console.log('shortcode element HTML: ' + shortcode);

					var str = shortcode.toLowerCase();

					//edit 12/11/16 by GN - this regex was not working becasue it looked for ANY integer in the element, and if there is stray HTML such as a span with line-height: 1.9, it could detect that.
					//match any integer in the string
					//id = shortcode.match(/\d+/)[0];
					//console.log('shortcode id: ' + id);

					//get a string between two other strings 
					var id = str.match('id="(.*)"]]');
					id = id[1];
					console.log('shortcode ID: ' + id);

					var type = computeType(str);
					var url = computeUrl(type, id);

					//shortcode element, type of media item, id of media item, ajax url
					createMediaItems($(this), type, id, url);
				});
			}
			else {
				checkVideo();
			}
		}

	}

	function createMediaItems(element, type, id, url) {

		get(element, type, id, url);

	}


	function get(element, type, id, url) {

		$.ajax({
			url: url,
			dataType: 'html',
		})
			.done(function (data) {
				results = data;
				if (results !== undefined) {
					//console.log("ajax request successful");
					parse(element, type, id, results);
				}
			})
			.fail(function () {
				console.log('❗ ️request Error on ' + type + ' ' + id);
				element.addClass('no-content');
				countAdvance();
			})
			.always(function () {
				//console.log("request complete");
			});

	}


	function parse(element, type, id, results) {

		if (results.indexOf("This is Webhook's 404") <= 0) {

			var markup = new DOMParser().parseFromString(results, 'text/html');
			var mediaHtml = markup.getElementsByClassName('media-item');

			mediaSlick = '#' + mediaHtml[0].id + ' .slick';

			if (type == 'slider') {
				sliderId = '#slider-' + id;
				renderSlider(element, type, id, results, mediaSlick, sliderId);
			}

			else {
				linkHtml = markup.getElementsByClassName('media-link-container')[0];
				linkId = '#' + linkHtml.id;
				renderLink(element, type, id, linkHtml, linkId);

				modalElementString = '#' + 'modal-' + type + '-' + id;
				modals.push(
					{
						modalType: type,
						modalId: id,
						modalHtml: mediaHtml,
						modalMediaSlick: mediaSlick,
						modalElementId: modalElementString
					}
				);

			}

		}
		else {

			console.log('❗ ️this shortcodes corresponding media-item has not been created');
			element.addClass('no-content');
			countAdvance();

		}

	}


	function renderSlider(element, type, id, results, mediaSlick, sliderId) {

		console.log('🔨 build slider ' + id);
		var slider = results;
		$(element).replaceWith(slider);
		var sliderElement = $(sliderId);
		var sliderSlick = $(mediaSlick);

		sliderSlick.on('init', function (event, slick, direction) {
			console.log('✅ slider ' + id + ' built');
			sliderSlick.addClass('initialized');
			sliderSlick.parent('.slider').removeClass('building').addClass('built');
		});

		// Use 'always' so a single failed image doesn't block slider init/completion
		sliderSlick.imagesLoaded().always(function (instance) {
			//console.log('images load event for slider');
			sliderSlick.slick({
				centerMode: true,
				slidesToShow: 1,
				centerPadding: '255px',
				arrows: true,
				dots: true,
				infinite: true,
				responsive: [
					{
						breakpoint: 1200,
						settings: {
							centerPadding: '160px'
						}
					},
					{
						breakpoint: 992,
						settings: {
							centerPadding: '115px'
						}
					},
					{
						breakpoint: 768,
						settings: {
							centerPadding: '10px'
						}
					}
				]
			});

			countAdvance();
			spy.update();

		});

	}


	function renderLink(element, type, id, linkHtml, linkId) {

		console.log('🔨 build link ' + id);

		var link = linkHtml;
		$(element).replaceWith(link);
		var linkElement = $(linkId);

		/* TEMPORARILY CHANGED DONE to ALWAYS - MUST BE CHANGED BACK!*/
		linkElement.imagesLoaded()
			.always(function (instance) {
				console.log('✅ link ' + id + ' built');

				linkElement.removeClass('building').addClass('built');

				linkElement.children('.media-link').click(function (event) {
					event.preventDefault();
					target = $(this).data('target');
					modalToggle(target);
					console.log('media-link');
				});

				spy.update();

				countAdvance();
			});

	}


	function countAdvance() {


		if (!linksComplete) {

			count += 1;
			//console.log('count: ' + count);

			if (count === shortcodesLength) {
				linksComplete = true;
				report();
				start = new Date().getTime();
				startModals();
				modalLength = modals.length;
			}

		}
		else {

			modalCount += 1;

			if (!shortcodesComplete) {
				if (modalCount === modalLength) {
					shortcodesComplete = true;
					report();
					cleanup();
				}
			}

		}

	}

	function startModals() {

		console.log('🔧 starting modal building 🔧');

		for (var i = 0; i < modals.length; i++) {
			renderModal(modals[i].modalType, modals[i].modalId, modals[i].modalHtml, modals[i].modalMediaSlick, modals[i].modalElementId);
		}

	}


	function renderModal(type, id, modalHtml, mediaSlick, modalId) {

		console.log('🔧 build ' + type + '-' + id);
		var modal = modalHtml;
		$('#media').append(modal);
		var modalElement = $(modalId);

		//can probably replace the imagesLoaded callback here, because of the use of non-global variables, and 

		setTimeout(function () {

			//console.log('images successfully loaded into mediaSlick');

			//**ADD** slick init callback 

			var modalSlick = $(mediaSlick);

			if (type == 'time') {
				//console.log('type == time');

				modalSlick.slick({
					arrows: false,
					dots: false,
					draggable: false,
					speed: 100,
					fade: true,
					infinite: false
				});

				//console.log('TIME: ');

				//console.log($(modalElement.children('.range')));

				//var timeInput = modalElement.find('.range');
				//console.log(timeInput);

				// $(timeInput).change(function () {
				// 	alert('change');
				// 	var value = $(this).val();
				// 	console.log('value: ' + value);
				// 	var element = $(this);
				// 	slick = element.siblings('.slick');	
				// 	label = slick.siblings('.label');		
				// 	timeslide(slick, label, value);
				// 	console.log('timeslider range input');
				// });

				label = modalSlick.siblings('.label');
				timeslide(modalSlick, label);

				console.log('✅ ' + type + '-' + id + ' built');

				countAdvance();
			}
			else if (type == 'typology') {
				//console.log('type == typology');

				modalSlick.slick({
					arrows: false,
					dots: true,
					infinite: true,
					swipe: false
				});

				//turned off case-study slick 
				// modalSlick.find('.case-study-slick').slick({
				// 	arrows: false,
				// 	dots: true,
				// 	draggable: false,
				// 	infinite: true	
				// });	

				console.log('✅ ' + type + '-' + id + ' built');

				countAdvance();
			}
			else if (type == 'gallery') {
				//console.log('type == gallery');
				if (modalSlick.hasClass('modal-gallery-text')) {
					modalSlick.slick({
						arrows: false,
						dots: true,
						fade: true,
						infinite: true
					});
				}
				else {
					modalSlick.slick({
						arrows: false,
						dots: true,
						fade: true,
						infinite: true
					});
				}

				console.log('✅ ' + type + '-' + id + ' built');

				countAdvance();
			}
			else {
				//console.log('no match found for type: ' + type)
			}

		}, 250);

	}


	//assure all events are bound correctly, and display the page if necessary
	function cleanup() {

		bindTimesliders();

		size();

		//console.log('cleanup');
		//checkVideo();

	}


	//report metrics on the shortcodes process once it's complete
	function report() {
		var reportName;

		console.log('📊 📊 📊        REPORT       📊 📊 📊 ');

		if (!shortcodesComplete) {
			console.log('⛓ ⛓ ⛓    LINKS COMPLETE   ⛓ ⛓ ⛓ ');
			reportName = 'Links';
		}
		else {
			console.log('⛰ ⛰ ⛰   MODALS COMPLETE   ⛰ ⛰ ⛰');
			console.log('💩 💩 💩 SHORTCODES COMPLETE 💩 💩 💩');
			reportName = 'Modals';
		}


		//report how long all the shortcodes took to load
		end = new Date().getTime();
		time = (end - start) / 1000;
		console.log('⏱ ' + reportName + ' Execution time: ' + time + ' seconds');

		//report the difference between document.height now and at the beginning of shortcodes.initialize
		endHeight = $(document).height();
		var heightDifferential = initialHeight - endHeight;
		console.log('📏 Height differential: ' + heightDifferential);

		console.log('📊 📊 📊 📊 END REPORT 📊 📊 📊 📊 📊 ');

	}


	//return an object with the methods within the function. is it best practice to include all of these? 
	return {
		hideShortcodes: hideShortcodes,
		initialize: initialize,
		cleanup: cleanup
	}


}



function computeType(str) {

	switch (str) {
		case (str.match(/gallery/) || {}).input:
			type = 'gallery';
			break;
		case (str.match(/slider/) || {}).input:
			type = 'slider';
			break;
		case (str.match(/time/) || {}).input:
			type = 'time';
			break;
		case (str.match(/typology/) || {}).input:
			type = 'typology';
			break;
		default:
			console.log('no type match found in shortcode');
			break;
	}

	return type;
}

function computeUrl(type, id) {

	var url;

	if (type == 'time') {
		url = '/timesliders/' + id;
	}
	else if (type == 'typology') {
		url = '/typologies/' + id;
	}
	else if (type == 'gallery') {
		url = '/galleries/' + id;
	}
	else if (type == 'slider') {
		url = '/sliders/' + id;
	}
	else {
		console.log('no match found for type: ' + type)
	}

	return url;
}


function modalToggle(_target, swap) {

	var modalTarget = _target;

	if ($('body').hasClass('modal-closed')) {
		$(modalTarget).removeClass('off');
		$(modalTarget).addClass('on');
		$('body').removeClass('modal-off');
		$('body').addClass('modal-on');
		if (!($(modalTarget).hasClass('modal-timeslider')) && !($(modalTarget).hasClass('modal-zoomable'))) {
			$('body').addClass('modal-arrows-on');
		} else { }

	} else { }

}

function modalClose() {

	if ($('body').hasClass('modal-on')) {
		$('.modal').removeClass('on');
		$('.modal').addClass('off');
		$('body').removeClass('modal-arrows-on');
		$('body').removeClass('modal-on');
		$('body').addClass('modal-off');
	}
	else { }

}

//bind events for shortcodes.js items
function bindMedia() {

	//console.log('bindMedia');

	//close any modal window
	$('.modal-close').click(function (event) {
		event.preventDefault();
		modalClose();
	});

	$('.modal-arrow').click(function (event) {
		event.preventDefault();
		var activeModal = $('.modal').filter('.on');
		var direction = $(this).data('direction');
		modalArrow(activeModal, direction);
	});

}


//bind events for timesliders
function bindTimesliders() {

	console.log('bindTimesliders');

	// $(document).on('input', '#slider', function() {
	// 	$('#slider_value').html( $(this).val() );
	// });


	$(document).on('input', '.range', function () {
		console.log('timeslider range input');
		var value = $(this).val();
		console.log('value: ' + value);
		var element = $(this);
		slick = element.siblings('.slick');
		label = slick.siblings('.label');
		timeslide(slick, label, value);
	});

}

function timeslide(slick, label, value) {

	console.log('timeslide');

	if (value != undefined) {
		value = value;
		slick.slick('slickGoTo', value);
	}

	var currentSlideIndex = slick.slick('slickCurrentSlide');
	slideElement = slick.find('img[data-slick-index=' + currentSlideIndex + ']');

	labelText = slideElement.data('label');
	label.text(labelText);

}


function modalArrow(activeModal, direction) {
	activeSlick = activeModal.find('.slick-main');
	if (direction == 'previous') {
		$(activeSlick).slick('slickPrev');
	}
	else if (direction == 'next') {
		$(activeSlick).slick('slickNext');
	}
}


function checkVideo() {

	console.log('checkVideo');

	var video = $('#hero-video'),
		videoElement = video[0];

	video.on('canplaythrough', function () {
		//console.log('videocanplaythrough event');
		if (!loaded) {
			video.unbind("canplaythrough");
			displayBody(500);
		}
	});

	// If the video is in the cache of the browser,
	// the 'canplaythrough' event might have been triggered
	// before we registered the event handler.
	if (videoElement.readyState > 3) {
		//console.log('readystate 4 condition');
		if (!loaded) {
			video.unbind("canplaythrough");
			displayBody(500);
		}
	}
}

function computeShortcodeHeight() {

	var ww = $(window).width();
	var slideInset;

	//get the amount of padding on slides to subtract from ww
	if (ww > 1200) {
		slideInset = 554;
	}
	else if (ww <= 1200 && ww >= 993) {
		slideInset = 380;
	}
	else if (ww <= 992 && ww >= 768) {
		slideInset = 260;
	}
	else if (ww < 768) {
		slideInset = 30;
	}

	var slideImageWidth = ww - slideInset;
	var slideImageProportion = .5625;
	var slideImageHeight = slideImageWidth * slideImageProportion;
	var additionalHeight = 90;

	var shortcodeHeight = slideImageHeight + additionalHeight;
	shortcodeHeight = Math.round(shortcodeHeight);

	linkHeight = shortcodeHeight;

	return shortcodeHeight;


}



