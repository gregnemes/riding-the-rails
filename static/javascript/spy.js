var spyActive = false;

function ScrollSpy(){
	
	var initialSet,currentElement,offsetDistance, menuLinks, targets, spyData;

	//initial target element, all target elements, offset distance
	function spyInitialize(_currentElement,_targets,_offsetDistance){

		initialSet = false;

		currentElement = _currentElement;

		//get all of the targets
		targets = _targets;

	    //how close to the top of the window the section is when it becomes active
		offsetDistance = _offsetDistance;		

		//create a new array 
		spyData = new Array();
		
		spyUpdate();

	}

	function spyUpdate(){

		/*
		* iterate through each target
		* build an object with [i].target = target element
		* and [i].targetOffset = spied item's offset position on the page
		* the each function loops through each item in an array
		* i represents a climbing integer
		*/ 
		targets.each(function(i){

			//create an object to hold each pair of link and target
	        spyData[i] = {};

			//store the information we care about	
			spyData[i].target = $(this);

			spyData[i].targetOffset = Math.round(spyData[i].target[0].offsetTop);

		});

		spyActive = true;

		spyRun();
	}


	function spyRun(){

		for(var j = 0; j < spyData.length; j++){

			var userLocation,targetPosition,nextTargetPosition;

			userLocation = $(window).scrollTop() + offsetDistance;
			targetPosition = spyData[j].targetOffset;


			if( j < (spyData.length - 1) ){
				nextTargetPosition = spyData[j+1].targetOffset;
			}

			//if the user's window.scrollTop is greater than or equal to the offsetTop of the element we're currently checking
			//AND
			//it's not the last targetable element OR the user's window.scrollTop is less than the next element
			//then we think this element should be active
			if( userLocation >= targetPosition && ( ( j == spyData.length - 1 ) || (userLocation < nextTargetPosition) ) ) {

				//if the element we think should be active is not the current element
				//OR
				//we haven't initialized the first element
				if(!currentElement.is(spyData[j].target) || !initialSet ){

					currentElement.removeClass('active');
					spyData[j].target.addClass('active');
					spyData[j].target.addClass('activated');

					currentElement = spyData[j].target;
					initialSet = true;		

					if($('body').hasClass('body-part') && (currentElement.hasClass('part-section'))){
						var breadCrumb = currentElement.data('bread-crumb');
						$('#header-nav-bread-crumbs-slash').html(' / ');						
						$('#header-nav-bread-crumbs-section').html(breadCrumb);
					}
					else{
						$('#header-nav-bread-crumbs-slash').html('');						
						$('#header-nav-bread-crumbs-section').html('');
						if($('body').hasClass('body-home')){
							var breadCrumb = currentElement.data('bread-crumb');
							$('#header-nav-bread-crumbs-page').html(breadCrumb);
						}
					}

				}

			}
						
		}

	}

	//return an object with three methods to initialize, update, and run the spy function
	return{
		initialize : spyInitialize,
		update : spyUpdate,
		run : spyRun
	}

}