

var media = Media();
var lastShortCode = false;
var loaded = false;


function Media(){

	var modalContainer = $('#media');	

	function initialize(){

		//find all the p tags with a media shortcode in them to construct our array of objects
		var shortcodes = $( ".wysiwyg p:contains('[[')" );

		shortcodes.each(function(i){

			if( i == 1 ){
				lastShortCode = true;
			}

			shortcode = $(this).html();
			id = shortcode.match(/\d+/)[0];
			str = shortcode.toLowerCase();
			type = computeType( str );
			url = computeUrl( type, id );	

			createMedia( $(this), type, id, url );			
					

		});

	}	

	function createMedia( element, type, id, url ){

		get( element, type, id, url );	

	}


	function get( element, type, id, url){

		$.ajax({
			url: url,
			dataType: 'json',
		})
		.done(function( data ) {

			results = data;

			if(results !== undefined){
				
				//console.log( 'request Success on ' + type + ' ' + id );
				parse( element, type, id, results );

			}

		})
		.fail(function() {

			console.log( 'request !Error! on ' + type + ' ' + id );

		})
		.always(function() {

			//console.log("request complete");

		});
		
	}


	function parse( element, type, id, results ){
		
		if(type === 'time' || type === 'typology'){
			results = results[id][0];
		}else{
			results = results[id];
		}

		// console.log( 'parsing ' + type + ' id="' + id + '"');
		// console.log( results );
		// console.log( '---' );

		switch (type) {
		  case 'gallery':
			renderGallery( element, type, id, results );
		    break;
		  case 'slider':
		    break;
		  case 'typology':
		    break;
		  case 'time':
		    break;			    			    
		  default:
		    console.log("no type match");
		    break;
		}	

	}


	function renderGallery( element, type, id, results ){

		//console.log( results );

		title = results.gallery_title;
		preview_image = results.gallery_preview_image;

		//link
		link = linkMarkupGallery( type, id, title, preview_image );
		$(element).replaceWith(link);
		$(element).imagesLoaded()
			.done( function( instance ) {
  				console.log('images successfully loaded into links');
  				spy.update();		  
  		});		

		//modal
		var modal = modalMarkupGallery( results, type, id );
		modalContainer.append(modal);

		$(modalContainer).imagesLoaded( function() {
  			console.log('images loaded into modal container!');
  			bind();
		});	

	}


	function bind(){

		bindMedia();		

		if(lastShortCode){
			cleanup();
		}

	}


	function cleanup(){

		setTimeout(function(){
			spy.update();
		 }, 1000);	

	}


	//return an object with the methods within the function. is it best practice to include all of these? 
	return{
		initialize : initialize	
	}

}


//general media creation functions

function linkMarkupGallery( type, id, gallery_title, gallery_preview_image ) {
	return [
		'<div class="media-link-container"><a href="#" class="media-link media-gallery-link" data-target="#modal-', type,'-', id,
		'" data-target-type="', type,
		'" data-target-id="', id,'">', 
		'<h5 class="media-title righted medium m0">', gallery_title, '</h5>',
		'<div class="media-preview">',
		'<img class="bordered media-preview-image media-link-image" src="', gallery_preview_image.url, '" />',
		'<span class="icon" data-icon="´"></span>',
		'</div></a></div>',
	].join('');
}

function modalMarkupGallery( results, type, id ) {
	return [
		'<div class="modal off modal-', type, '" id="modal-', type, '-', id,
		'" data-type="', type,
		'" data-id="', id,'" >',
		galleryLoop( results ),
		'</div>'
	].join('');
}

function galleryLoop( results ){

	gallery_images = results.gallery_images;

	var galleryHtml = '<div class="gallery-slick">';
	for (i = 0; i < gallery_images.length; i++) { 
		galleryHtml += '<div class="slide"><img src="' + gallery_images[i].url + '"/></div>';
	}
	galleryHtml += '</div>';

	console.log(galleryHtml);
	return galleryHtml;

}

function computeType( str ){

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
	    console.log("no type match");
	    break;
	}	

	return type;
}

function computeUrl( type, id ){	

	var url;

	urlSplit = window.location.href.split( '/' );
	pageUrl = urlSplit[3];	

	if(type == 'time'){
		url = '/timesliders/';
	}

	else if(type == 'typology'){
		url = '/typologies/';
	}

	else if(type == 'gallery'){
		switch (pageUrl) {
		  case (pageUrl.match(/part1/) || {}).input:
		    url = '/gallery1/';
		    break;
		  case (pageUrl.match(/part2/) || {}).input:
		    url = '/gallery2/';
		    break;
		  case (pageUrl.match(/part3/) || {}).input:
		    url = '/gallery3/';
		    break;
		  case (pageUrl.match(/epilogue/) || {}).input:
		    url = '/gallery4/';
		    break;			    			    
		  default:
		    url = '/gallery0/';
		    //console.log("no type match");
		    break;
		}		
	}

	else if(type == 'slider'){
		switch (pageUrl) {
		  case (pageUrl.match(/part1/) || {}).input:
		    url = '/slider1/';
		    break;
		  case (pageUrl.match(/part2/) || {}).input:
		    url = '/slider2/';
		    break;
		  case (pageUrl.match(/part3/) || {}).input:
		    url = '/slider3/';
		    break;
		  case (pageUrl.match(/epilogue/) || {}).input:
		    url = '/slider4/';
		    break;			    			    
		  default:
		    url = '/slider0/';
		    //console.log("no type match");
		    break;
		}		
	}	

	return url;
}


function modalToggle(_target,swap){	
	
	var modalTarget = _target;

	if($('body').hasClass('modal-closed')){		
		$(modalTarget).removeClass('off');
		$(modalTarget).addClass('on');
		$('body').removeClass('modal-off');
		$('body').addClass('modal-on');
	}else{}		

}

function modalClose(){
		
	if($('body').hasClass('modal-on')){		
		$('.modal').removeClass('on');
		$('.modal').addClass('off');
		$('body').removeClass('modal-on');
		$('body').addClass('modal-off');
	}
	else{}

}

//bind events for media.js items
function bindMedia(){

	//media links to open modal windows
	$('.media-link').click(function(event){
		event.preventDefault();
		target = $(this).data('target');
		modalToggle(target);
	});

	//close any modal window
	$('.modal-close').click(function(event){
		event.preventDefault();
		modalClose();
	});

	$('.gallery-slick').slick({
		arrows: true,
		dots: true,
		focusOnSelect: true,
		slidesToShow: 1	
	});		

}


