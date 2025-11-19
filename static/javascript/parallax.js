function parallax(){

	pBody = $('body').scrollTop();
	console.log('pBody = ' + pBody);
	
	pNumTemp = $('.number').css('bottom');
	console.log('pNumTemp = ' + pNumTemp);
	
	pNum = pBody/6;
	console.log('pNum = ' + pNum);
	
	
	$('.title').css('left',pNum);
	$('.subtitle').css('left',-pNum);
	$('.section-title').css('left',pNum);

}
