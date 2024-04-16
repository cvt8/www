$(document).ready(() => {
    $('.popup-trigger').click(function(){
    $(this).children($('.popup')).toggleClass("show")
  });
  $('.popup-trigger').mouseenter(function(){
    $(this).children($('.popup')).addClass("show")
  });
  $('.popup-trigger').mouseleave(function(){
    $(this).children($('.popup')).removeClass("show")
  });
});