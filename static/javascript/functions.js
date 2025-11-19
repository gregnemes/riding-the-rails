
//global variables
var cw, ch;
var loaded = false;
var spy = ScrollSpy();
var shortcodes = Shortcodes();
var media = Media();



/* DOCUMENT/WINDOW EVENTS */

//once the DOM is ready, do the things
$(document).ready(function ($) {

	console.log('document.ready (functions.js)');

	shortcodes.hideShortcodes();

	bind();
	size();

	isWindows();

	// Initialize shortcodes early to avoid race conditions with window.load on some pages
	if (typeof shortcodes !== 'undefined' && shortcodes.initialize && !window.__shortcodesInit) {
		window.__shortcodesInit = true;
		shortcodes.initialize();
	}

	// Prefer data-resize-src for any existing images on initial load
	// (removed per request) No JS swapping of image src; handled statically in HTML

	setTimeout(function () {
		if (!loaded) {
			console.log('window.load taking longer than 10 seconds, so call displayBody')
			displayBody(250);
		}
	}, 10000);

});

//the first time the size function is called, this event triggers, and sets in motion the first steps of displaying the page
$(document).one('sized', function () {

	//console.log('one sized');
	spy.initialize($('.target-initial'), $('.block'), 40);

});

$(window).load(function () {

	console.log('window.load (functions.js)');

	//call a function to remove the loading veil, and call other important functions
	displayBody();

	if (!window.__shortcodesInit && typeof shortcodes !== 'undefined' && shortcodes.initialize) {
		window.__shortcodesInit = true;
		shortcodes.initialize();
	}

});




/* GENERAL FUNCTIONS */

function displayBody(duration) {

	console.log('displayBody');

	if (!loaded) {

		setTimeout(function () {
			loaded = true;

			if (routeActive) {
				routeMove();
			}

			size();
			spy.update();

			$('.loading').addClass('loading-transition');
			$('.loading').addClass('loaded');
			$('.loading-veil').addClass('loaded');

		}, duration);

	}

}


function cycleMenu() {
	if ($('menu').hasClass('open')) {
		$('menu').removeClass('open').addClass('closed');
		$('body').removeClass('menu-open').addClass('menu-closed');
		$('#blanket').removeClass('on').addClass('off');
		$('body').css({ overflow: 'scroll' });
	} else {
		$('menu').removeClass('closed').addClass('open');
		$('body').removeClass('menu-closed').addClass('menu-open');
		$('#blanket').removeClass('off').addClass('on');
		$('body').css({ overflow: 'hidden' });
	}
}


function menuNavToggle(_link) {
	var sibling = $(_link).next();
	var link = _link;

	if ($(sibling).hasClass('closed')) {
		$(sibling).removeClass('closed').addClass('open');
		$(sibling).slideDown();
		$(link).addClass('opened');
	}
	else {
		$(sibling).removeClass('open').addClass('closed');
		$(sibling).slideUp();
		$(link).removeClass('opened');
	}
}

//animate jump links
function scrollLink(destination, speed) {
	if (!speed) {
		speed = 1500;
	}
	$('html,body').animate({
		scrollTop: $(destination).offset().top - 80
	}, speed);
}


//bind events to elements	
function bind() {

	//back to top button
	$('#backtotop').click(function (event) {
		event.preventDefault();
		$('body,html').animate({ scrollTop: 0 }, 2000);
	});

	//smooth scrolling jump links
	$(".jump").click(function (e) {
		e.preventDefault();
		var href = $(this).attr("href");
		href = href.toLowerCase();
		scrollLink(href);
	});

	//toggling the menu open and closed
	$(".menu-toggle").click(function (e) {
		e.preventDefault();
		cycleMenu();
	});

	//closing the menu by clicking the blanket
	$('#blanket').click(function (event) {
		event.preventDefault();
		cycleMenu();
	});

	//closing the menu by clicking the menu
	$('#menu').click(function (event) {
		cycleMenu();
	}).on('click', 'a', function (event) {
		event.stopPropagation();
	});

	// //closing the menu by clicking the menu
	// $('#menu a').click(function(event) {
	//   	event.stopPropogation();
	// });		

	$(document).keyup(function (e) {
		if (e.keyCode == 27) { // escape key maps to keycode `27`
			modalClose();
		}
	});

	$(document).keyup(function (e) {
		if (e.keyCode == 77) {
			var ww = 1440;
			var padding = 255;
			var paddingDoubled = padding * 2;
			var slidePadding = 22;
			var slidePaddingDoubled = slidePadding * 2;
			var dotsAndCaption = 90;


			var sliderWidth = $('#slider-1').width();
			var sliderHeight = $('#slider-1').height() + 30;
			var proportion = sliderHeight / sliderWidth;
			// console.log('-----------------')
			// console.log('proportion: ' + proportion);

			var myPrediction = (ww - paddingDoubled - slidePaddingDoubled) * .5625;
			var myPrediction = myPrediction + dotsAndCaption;

			//console.log('myPrediction: ' + myPrediction);

			var shortcodes = $(".wysiwyg p:contains('[[')");

			console.log('sliderHeight: ' + sliderHeight);
			console.log('shortcodeHeight: ' + computeShortcodeHeight());

		}
	});

}



//when scrolling, perform these actions, always with window.requestAnimationFrame
$(window).scroll(function () {

	if (!$('body').hasClass('modal-on')) {
		if (spyActive && $(window).width() > 767) {
			window.requestAnimationFrame(spy.run);
		}
		if (routeActive && $(window).width() > 767) {
			window.requestAnimationFrame(routeMove);
		}
	}

});


var resizeEvents = debounce(function () {
	window.requestAnimationFrame(size);
	if (routeActive && $(window).width() > 767) {
		window.requestAnimationFrame(routeMove);
	}
}, 250);

window.addEventListener('resize', resizeEvents);


// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
	//console.log('debounce');
	var timeout;
	return function () {
		var context = this, args = arguments;
		var later = function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function isWindows() {

	var flag = navigator.platform.indexOf('Win') > -1;

	if (flag) {
		$('body').addClass('windows');
	}

	if (navigator.userAgent.indexOf("MSIE 10.0") !== -1) {
		$('html').addClass('ie10');
		console.log('ie10');
	} else {
		$('html').addClass('not-ie10');
		console.log('NOT ie10');
	}

	return flag;

}


