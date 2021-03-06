
var token = $("meta[name='_csrf']").attr("content");
var header = $("meta[name='_csrf_header']").attr("content");

var barApp = angular.module('BarApp', ['ngAnimate', 'ui.bootstrap']);

barApp.config(['$qProvider','$httpProvider', function($qProvider, $httpProvider){
    $qProvider.errorOnUnhandledRejections(false);
    $httpProvider.defaults.headers.common[header] = token;
}]);
barApp.controller('barController', function ($scope, $http, $uibModal) {
    $scope.events = [];
    $scope.clearEvents = [];
    $scope.orderProperty = initOrderby();

    $http.get('todolist/events').then(function (data) {
        $scope.events = data.data;
        for(var i = 0; i < $scope.events.length; i++){
            $scope.addTimeString($scope.events[i]);
        }

    });
    $http.get('todolist/clearevents').then(function (data) {
        $scope.clearEvents = data.data;
        for(var i = 0; i < $scope.clearEvents.length; i++){
            $scope.addTimeString($scope.clearEvents[i]);
        }
    });

    $scope.addTimeString = function(data){
        if(data.event_time===null || data.event_time === ''){
            data.event_time_string = getEventTimeStringByDateTime(data.date_event, false);
        }else{
            data.event_time_string = getEventTimeStringByDateTime(data.event_time, true);
        }
    }

    $scope.display = function(){
        return {
            "display" : "inline-block"
        };
    }

    $scope.getEventTimeClass = function(day){
        var className = 'todo_event_time';
        var diffday = Math.ceil((new Date().getTime() - new Date(day).getTime()) / (1000 * 3600 * 24)) - 1;
        if(diffday>0){
            className = 'todo_event_time before';
        }else if(diffday<0){
            className = 'todo_event_time after';
        }
        return className;
    };

    $scope.getToday = function(){
        var date = new Date();
        return date.getMonth()+1 + "월 " + date.getDate() + "일";
    }
    $scope.getTodayName = function(){
        var date = new Date();
        var week = ['일', '월', '화', '수', '목', '금', '토'];
        var dayOfWeek = week[date.getDay()];
        return dayOfWeek + "요일";
    }

    $scope.clearEvent = function(event){
        var e = {};
        var isClear = event.event_state===1;
        var index = 0;
        if(!isClear){
            for(var i = 0; i < $scope.events.length; i++){
                if($scope.events[i].id === event.id){
                    index = i;
                    break;
                }
            }
            e = $scope.events[index];
            e.event_state = 1;
        }else{
            for(var i = 0; i < $scope.clearEvents.length; i++){
                if($scope.clearEvents[i].id === event.id){
                    index = i;
                    break;
                }
            }
            e = $scope.clearEvents[index];
            console.log(e.event_time_string);
            e.event_state = 0;
        }

        $http({
            method: 'PUT',
            url: 'schedule/create',
            data: e
        }).then(function successCallback(response){
            console.log('success update -> ' + response.data);
            if(!isClear){
                $scope.clearEvents.push(e);
                $scope.events.splice(index, 1);
            }else{
                $scope.clearEvents.splice(index, 1);
                $scope.events.push(e);
            }

            // 스케쥴페이지에서 이벤트의 위치를 옮김
            var calAppScope = angular.element(document.querySelector('[ng-app=calendar]')).scope().$$childHead.$$childHead;
            var items = calAppScope.eventList;
            for(var i = 0; i < items.length; i++){
                if(items[i].id===e.id){
                    items[i].event_state = 1;
                    calAppScope.$apply();
                    break;
                }
            }
        }, function errorCallback(response){
            e.event_state = 0;
            console.log('error update -> ' +response);
        });
    };

    $scope.summaryEvent = function(){

    };


    $scope.popupSortMenu = function () {
        $('.todo_popup_menu').toggleClass('show');
    }

    $scope.setOrder = function(num){
        switch (num) {
            case 0:
                $scope.orderProperty="event_time";
                break;
            case 1:
                $scope.orderProperty="-event_point";
                break;
            default:
                break;
        }
        setCookie('todoOrderby', $scope.orderProperty, 7);
        $scope.popupSortMenu();
    }

    $scope.select = function(event, $event) {
        if($event.target.className.indexOf('check') !== -1){
            return;
        }
        var modalInstance = $uibModal.open({
            templateUrl: "modal/modal_event",
            controller: "ModalContentCtrl",
            size: ''
        });
        if(document.querySelector('[ng-app=calendar]')!=null)
            modalInstance.calendarAppScope = angular.element(document.querySelector('[ng-app=calendar]')).scope().$$childHead.$$childHead;
        modalInstance.positionX = $event.currentTarget.getBoundingClientRect().x;
        modalInstance.positionY = $event.currentTarget.getBoundingClientRect().y;
        modalInstance.width = $event.currentTarget.clientWidth;
        //Internet Explorer 예외
        if(modalInstance.positionX==undefined){
            var elem = $event.currentTarget;
            var top = 0, left = 0;
            do {
                top += elem.offsetTop  || 0;
                left += elem.offsetLeft || 0;
                elem = elem.offsetParent;
            } while(elem);
            modalInstance.positionX = left;
            modalInstance.positionY = top;
            modalInstance.width = $event.currentTarget.offsetWidth;
        }
        modalInstance.parent = $scope;
        modalInstance.eventInfo = event;
        modalInstance.result.then(function (response) {
            $scope.result = '${response} button hitted';
        });
    };

    function initOrderby(){
        var orderby = getCookie('todoOrderby');
        if(orderby!=null)
            return orderby;
        else
            return "event_time";
    }
});

barApp.controller('ModalContentCtrl', function($scope, $uibModalInstance, $http) {
    $scope.event = {};
    $scope.eventDefaultData = {};
    $scope.isLoadCompleted = false;
    $scope.isUpdated = false;
    $scope.show = function(){
        var posX = $uibModalInstance.positionX;
        var posY =  $uibModalInstance.positionY;
        var width = $uibModalInstance.width;
        $scope.event = $uibModalInstance.eventInfo;
        $scope.setEventPoint();
        var elem = document.getElementById('modal_event_content');

        if(posX * 2> $(document).width()+200){
            elem.style.marginLeft= posX-(405)+'px';
        }else{
            elem.style.marginLeft= posX+'px';
        }

        var correctHeight = window.outerHeight - (posY + elem.offsetHeight);

        if(correctHeight<50){
            if($scope.event.event_type===0)
                elem.style.marginTop = posY - 280 +'px';
            else if($scope.event.event_type===1){
                elem.style.marginTop = posY - 296 +'px';
            }
        }else{
            elem.style.marginTop = (posY + 45)+'px';
        }

        if($scope.event.event_time!=null){
            $scope.event.event_time_temp = new Date($scope.event.event_time);
            $scope.event.isAllDay = false;
        }else{
            $scope.event.event_time_temp = new Date($scope.event.date_event);
            $scope.event.isAllDay = true;
        }
        $scope.isLoadCompleted = true;
        $scope.eventDefaultData = clone($scope.event);
    };

    $scope.$watch('event ', function (newValue, oldValue) {
        if($scope.isLoadCompleted){
            if(newValue!==oldValue && !$scope.isUpdated ){
                $scope.isUpdated = true;
            }
        }
    }, true);
    $scope.removeEvent = function(){
        if(confirm("일정을 삭제하시겠습니까?")){
            $http({
                method: 'DELETE',
                url: 'schedule/delete',
                params: {id:$scope.event.id},
                headers: {
                    'Content-type': 'application/json;charset=utf-8'
                }
            }).then(function successCallback(response){
                if($scope.event.event_state===0){
                    $uibModalInstance.parent.events.splice($uibModalInstance.parent.events.indexOf($uibModalInstance.eventInfo),1);
                }else{
                    $uibModalInstance.parent.clearEvents.splice($uibModalInstance.parent.clearEvents.indexOf($uibModalInstance.eventInfo),1);
                }
                // 스케쥴페이지 갱신
                if($uibModalInstance.calendarAppScope!=null){
                    var items = $uibModalInstance.calendarAppScope.eventList;
                    for(var i = 0; i < items.length; i++){
                        if(items[i].id===$scope.event.id){
                            items.splice(i,1);
                            $uibModalInstance.calendarAppScope.moveDayEvent($scope.event.date_event,$scope.event.date_event);
                            break;
                        }
                    }
                }

                $scope.close();
            }, function errorCallback(response){
                console.log('error delete -> ' +response);
            });
        }
    }
    $scope.saveEvent = function(){
        if($scope.event.event_type===2)
            return;
        $http({
           method: 'PUT',
           url: 'schedule/create',
           data: {
               id: $scope.event.id,
               date_event: $scope.event.event_time_temp.yyyyMMddHHmmss().substring(0,10),
               event_time: $scope.event.isAllDay ? null : $scope.event.event_time_temp.yyyyMMddHHmmss(),
               title: $scope.event.title,
               event_description: $scope.event.event_description,
               event_type: $scope.event.event_type,
               event_state: $scope.event.event_state,
               event_point: $scope.event.event_point,
               event_color: $scope.event.event_color
           }
        }).then(function successCallback(response){
            console.log('success update -> ' + response.data);
            var beforeDateEvent = $scope.event.date_event;
            var afterDateEvent = $scope.event.event_time_temp.yyyyMMddHHmmss();
            $scope.event.date_event = afterDateEvent.substring(0,10);
            $scope.event.event_time = $scope.event.isAllDay ? null : afterDateEvent;
            
            // 할일 목록창 갱신
            if($scope.event.event_time==null){
                $scope.event.event_time_string = getEventTimeStringByDateTime($scope.event.date_event, false);
            }else{
                $scope.event.event_time_string = getEventTimeStringByDateTime($scope.event.event_time, true);
            }

            // 스케쥴페이지에서 이벤트의 위치를 옮김
            if($uibModalInstance.calendarAppScope!=null){
                var items = $uibModalInstance.calendarAppScope.eventList;
                for(var i = 0; i < items.length; i++){
                    if(items[i].id===$scope.event.id){
                        items[i].date_event = $scope.event.date_event;
                        items[i].title = $scope.event.title;
                        items[i].event_description = $scope.event.event_description;
                        $uibModalInstance.calendarAppScope.moveDayEvent(beforeDateEvent,afterDateEvent.substring(0,10));
                        break;
                    }
                }
            }

            // 완료 상태 변경시
            if($scope.eventDefaultData.event_state !== $scope.event.event_state){
                $uibModalInstance.parent.clearEvent($scope.eventDefaultData);
            }

            $scope.eventDefaultData = clone($scope.event);
            alert('성공적으로 변경된 사항이 저장되었습니다.');
        }, function errorCallback(response){
            console.log('error dupdate -> ' +response);
        });
    }
    $scope.ok = function(){
        $uibModalInstance.close("Ok");
    }
    $scope.cancel = function(){
        $scope.close();
    }
    $scope.cancelOutside = function($event){
        if($event.target==$event.currentTarget){
            $scope.close();
        }
    }
    $scope.close = function(){
        $scope.rollbackData();
        var elem = document.getElementById('modal_event_content');
        elem.style.animationName='animateFadeHide';
        elem.style.opacity='0';
        setTimeout(function() {
            $uibModalInstance.dismiss();
        }, 200);
    }

    $scope.setEventPoint = function(){
        switch ($scope.event.event_point) {
            case 0:
                $scope.event_point_text = '매우 낮음';
                break;
            case 1:
                $scope.event_point_text = '낮음';
                break;
            case 2:
                $scope.event_point_text = '보통';
                break;
            case 3:
                $scope.event_point_text = '중요';
                break;
            case 4:
                $scope.event_point_text = '매우 중요';
                break;
        }
    }

    $scope.clearTodo = function(){
        $scope.event.event_state = $scope.event.event_state===0 ? 1 : 0;
    }

    $scope.rollbackData = function(){
        $scope.event.event_state = $scope.eventDefaultData.event_state;
        $scope.event.event_color = $scope.eventDefaultData.event_color;
        $scope.event.title = $scope.eventDefaultData.title;
        $scope.event.date_event = $scope.eventDefaultData.date_event;
        $scope.event.date_event_end = $scope.eventDefaultData.date_event_end;
        $scope.event.event_point = $scope.eventDefaultData.event_point;

    }

});

function getEventTimeStringByDateTime(datetime, isTargetTime){
    var diffday = Math.ceil((new Date().getTime() - new Date(datetime).getTime()) / (1000 * 3600 * 24));
    if(diffday===0){
        diffday = '오늘';
    }else if(diffday===1){
        diffday = '어제';
    }else if(diffday===-1){
        diffday = '내일';
    }else if(diffday>=2){
        diffday = diffday + '일 전';
    }else if(diffday<-1){
        diffday = diffday*-1 + '일 후';
    }
    return isTargetTime ? diffday + " " + datetime.substring(11,16) : diffday + " 종일";
}


angular.bootstrap(document.getElementById('mybar'), ['BarApp']);