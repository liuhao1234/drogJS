(function($){
    //定义类
    $.fn.drog = function(options){
        /* 定义默认参数 */
        var defs = {
            viewInfo:{},
            limitSize:{
                width:256,
                height:218
            },
            renderItem:function(idList){

            }
        }
        /* 合并参数 */
        var opts = $.extend({},defs,options);
        
        /* 定义私有变量 */
        var $document = $(document);
        var $window = $(window);
        var direction = [];//drogItem移动方向,direction[0]是左右移动的距离,左移为负数，direction[1]是上下移动的距离，上移为负数
        var itemDetail = {}; //记录当前操作的drogItem的数据
        var touchSpace = 50; //贴合间距，当元素之间距离小于touchSpace会自动贴合
        var animateSpeed = 300;//默认动画速度
        var resizeTimer = null;
        var scrollTimer = null;
        var hasRenderChartIdList = [];//已经渲染过的图表元素id
        var $this = this;

        var clientInfo = {//当前浏览器可视区的大小
            width:$window.width(),
            height:$window.height()
        }
        
        /* 定义类属性 */
        this.viewInfo = opts.viewInfo;//组件中所有drogItem的数据
        /* 绑定事件 */
        /* 
            clientX:点击位置距离当前浏览器可视区域的x坐标
            pageX:对于整个页面来说，包括了被卷去的body部分的长度
            screenX:点击位置距离当前电脑屏幕的x坐标
            offsetX:相对于带有定位的父盒子的x坐标
         */
        this.delegate(".drog-item-wrap","mousedown",function(ev){//移动位置
            if(!$(ev.target).is(".drog-item-wrap")) return;
            // console.log(ev.target)
            var $drogItem = $(this);
            if($drogItem.hasClass("item-in-fullscreen")) return;
            $drogItem.addClass("item-to-top").siblings().removeClass("item-to-top")
            itemDetail = getItemDetail($drogItem);
            var itemInfo = itemDetail.itemInfo;
            // console.log(itemInfo)
            //获取scrollTop
            var scrollTop = $window.scrollTop();
            //当前浏览器的宽高
            var clientWidth = clientInfo.width;
            var clientHeight = clientInfo.height;
            //获取初始定位
            var itemStartTop = itemInfo.top;
            var itemStartWidth = itemInfo.width;
            var itemStartLeft = itemInfo.left;
            var itemStartRight = clientWidth-itemStartWidth-itemInfo.left;
            
            //鼠标落点距离this左侧与上侧距离
            var startPageX = ev.pageX;
            var startPageY = ev.pageY;
            
            $document.mousemove(function(e){
                // console.log(e)
                // 获取鼠标距离body左侧与上侧的距离
                var endPageX = e.pageX;
                var endPageY = e.pageY;
                // 计算移动距离
                var moveX = endPageX-startPageX;
                var moveY = endPageY-startPageY;
                if(moveX<-itemStartLeft){
                    moveX = -itemStartLeft
                }else if(moveX>itemStartRight){
                    moveX = itemStartRight
                }
                if(moveY<-(itemStartTop-scrollTop)){
                    moveY = -(itemStartTop-scrollTop)
                }else if(moveY>clientHeight-42-(itemStartTop-scrollTop)){
                    moveY = clientHeight-42-(itemStartTop-scrollTop)
                }
                direction = [moveX,moveY]; //记录元素移动方向
                // 计算定位
                var positionLeft = itemStartLeft+moveX;
                var positionTop = itemStartTop+moveY;

                // 定位
                itemInfo.left = positionLeft
                itemInfo.top = positionTop
                $drogItem.css({left:positionLeft,top:positionTop})
            })
            
            $document.mouseup(function(){
                $document.unbind("mousemove");
                $document.unbind("mouseup");
                var isOverlap = isOverlapWidthOthers(itemDetail)
                if(isOverlap){//drogitem重叠需要回到原位置
                    var backWayDirection = [-direction[0],-direction[1]]
                    drogItemMove($drogItem,backWayDirection);
                }else{//drogitem没重叠，判断位置关系做贴合
                    var positionDetail = borderUponLines(itemDetail,false);
                    var plyingUpDirection = getPlyingUpDirection(positionDetail);
                    drogItemMove($drogItem,plyingUpDirection);
                }
            })
        })
        $document.bind("click",function(){
            $(".more-tools").next().hide();
        })
        this.delegate(".drog-item-resize","mousedown",function(ev){//放大缩小
            ev.stopPropagation()
            var $drogItem = $(this).parent();
            $drogItem.addClass("item-to-top").siblings().removeClass("item-to-top")
            itemDetail = getItemDetail($drogItem);
            var itemInfo = itemDetail.itemInfo;
            var scrollTop = $window.scrollTop();
            var itemStartWidth = itemInfo.width;
            var itemStartHeight = itemInfo.height;
            var startPageX = ev.pageX;
            var startPageY = ev.pageY;
            var clientWidth = clientInfo.width;
            var clientHeight = clientInfo.height;
            $document.mousemove(function(e){
                var endPageX = e.pageX;
                var endPageY = e.pageY;
                // 计算移动距离
                var moveX = endPageX-startPageX;
                var moveY = endPageY-startPageY;
                // 计算宽高
                var itemEndWidth = itemStartWidth+moveX;
                var itemEndHeight = itemStartHeight+moveY;
                
                //设置大小
                if(itemEndWidth>opts.limitSize.width){
                    var maxWidth = clientWidth-itemInfo.left;
                    var resultWidth = itemEndWidth>maxWidth?maxWidth:itemEndWidth;
                    $drogItem.css({width:resultWidth})
                    itemInfo.width = resultWidth
                }
                if(itemEndHeight>opts.limitSize.height){
                    var maxHeight = clientHeight-itemInfo.top+scrollTop;
                    var resultHeight = itemEndHeight>maxHeight?maxHeight:itemEndHeight
                    $drogItem.css({height:resultHeight})
                    $drogItem.find(".drog-item-main").css({height:resultHeight-42})
                    itemInfo.height = resultHeight
                }
            })
            
            $document.mouseup(function(ev){
                $document.unbind("mousemove");
                $document.unbind("mouseup");
                var isOverlap = isOverlapWidthOthers(itemDetail)
                if(isOverlap){
                    var plyingUpSize = [itemStartWidth,itemStartHeight]
                    drogItemSize($drogItem,plyingUpSize);
                }else{
                    var positionDetail = borderUponLines(itemDetail,false);
                    var finalSize = getPlyingUpSize(positionDetail);
                    drogItemSize($drogItem,finalSize)
                }
            })
        })

        this.delegate(".fullscreen","click",function(ev){//全屏放大与隐藏
            ev.stopPropagation();
            var $this = $(this);
            var $drogItem = $this.parents(".drog-item-wrap");
            var dataId = $drogItem.data("id");
            var itemInfo = itemDetail.itemInfo;
            var isFullscreen = $this.hasClass("icon-selfscreen");
            if(isFullscreen){//处于全屏显示状态是点击缩小
                $drogItem.animate({
                    left:itemInfo.left,
                    top:itemInfo.top,
                    width:itemInfo.width,
                    height:itemInfo.height
                },animateSpeed,"swing",function(){
                    $drogItem.removeClass("item-in-fullscreen")
                })
                $drogItem.find(".drog-item-main").height(itemInfo.height-42)
                $this.removeClass("icon-selfscreen").addClass("icon-fullscreen")
            }else{//处于缩小显示状态是点击放大
                itemDetail = getItemDetail($drogItem);
                var itemInfo = itemDetail.itemInfo
                var clientWidth = clientInfo.width;
                var clientHeight = clientInfo.height;
                $drogItem.animate({
                    left:0,
                    top:0,
                    width:clientWidth,
                    height:clientHeight
                },animateSpeed)
                $drogItem.find(".drog-item-main").height(clientHeight-42)
                $this.removeClass("icon-fullscreen").addClass("icon-selfscreen")
                $drogItem.addClass("item-in-fullscreen")
            }
        })

        this.delegate(".more-tools","click",function(ev){//更多列表显示与隐藏
            ev.stopPropagation();
            var $this = $(this);
            var $moreTools = $this.next();
            $moreTools.toggle();
        })

        this.delegate(".del_item","click",function(ev){
            ev.stopPropagation();
            var id = $(this).parents(".drog-item-wrap").data("id");
            $this.removeItem(id);
        })

        $window.resize(function(){//window放大缩小
            clearTimeout(resizeTimer)
            resizeTimer = setTimeout(function(){
                clientInfo = {
                    width:$window.width(),
                    height:$window.height()
                }
                itemInfoResize($this.viewInfo);
                itemResizeWhenWindowChange($this.viewInfo);
            },500)
        })

        $window.scroll(function(){//window滚动时需要渲染的元素id
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function(){
                var needRanderChartIdList = getRanderItemIdList();
                opts.renderItem(needRanderChartIdList);
            },1000)
        })

        /* 定义类的方法 */
        this.initView = function(viewInfo){//根据数据渲染页面
            this.empty();
            var itemListStr = '';
            var itemList = itemInfoResize(viewInfo).itemList;
            var needRanderChartIdList = getRanderItemIdList();
            $.each(itemList,function(index,value){
                itemListStr += itemModule(value);
            })
            opts.renderItem(needRanderChartIdList);
            this.append(itemListStr);
        }
        this.getViewInfo = function(){//获取所有拖拽组件数据
            return $this.viewInfo;
        }
        this.addDrogItem = function(data){//添加拖动组件
            var defs = {
                id:new Date().getTime(),
                title:'未命名图表',
                moreList:["删除"],
                itemInfo:{
                    left:$this.viewInfo.margin,
                    top:$this.viewInfo.margin,
                    width:opts.limitSize.width,
                    height:opts.limitSize.height
                }
            }
            var newDrogItemDetail = $.extend({},defs,data);
            getNewDrogItemPosition(newDrogItemDetail);
            $this.viewInfo.itemList.push(newDrogItemDetail);
            var newDrogItemDom = itemModule(newDrogItemDetail);
            $this.append(newDrogItemDom);
            var needRanderChartIdList = getRanderItemIdList();
            opts.renderItem(needRanderChartIdList);
        }
        this.removeItem = function(id){//删除拖动组件
            $("div[data-id="+id+"]").remove();
            var idIndex = null;
            $.each($this.viewInfo.itemList,function(index,value){
                if(value.id === id){
                    idIndex = index;
                    return false;
                }
            })
            $this.viewInfo.itemList.splice(idIndex,1);
        }

        /* 定义私有方法 */
        function getItemDetail(item){//获取拖动对象的信息
            var id = item.data("id");
            var result = null;
            $.each($this.viewInfo.itemList,function(index,value){
                // console.log(111)
                if(value.id === id){
                    result = value;
                    return false
                }
            })
            return result
        }

        function drogItemMove(drogItem,direction){//移动drogItem
            var itemInfo = itemDetail.itemInfo;
            drogItem.animate({
                top:itemInfo.top+direction[1],
                left:itemInfo.left+direction[0]
            },animateSpeed)
            itemInfo.top = itemInfo.top+direction[1]
            itemInfo.left = itemInfo.left+direction[0]
        }

        function drogItemSize(drogItem,size){//缩放drogItem
            var itemInfo = itemDetail.itemInfo;
            var width = size[0];
            var height = size[1];
            itemInfo.width = width;
            itemInfo.height = height;
            drogItem.animate({
                width:width,
                height:height
            },animateSpeed)
        }

        function itemResizeWhenWindowChange(viewInfo){//浏览器放大缩小drogItem随之变化
             $.each(viewInfo.itemList,function(index,value){
                // console.log(value)
                var id = value.id;
                $("div[data-id="+id+"]").animate({
                    width:value.itemInfo.width,
                    height:value.itemInfo.height,
                    left:value.itemInfo.left,
                    top:value.itemInfo.top
                },animateSpeed)
             })
        }

        function itemInfoResize(viewInfo){//根据当前可视区大小与数据的可视区大小计算当前宽高
            // 当前浏览器可视区大小
            var clientWidth = clientInfo.width;
            var clientheight = clientInfo.height;

            // viewInfo的可视区大小
            var historyClientWidth = viewInfo.clientInfo.width
            var historyClientHeight = viewInfo.clientInfo.height
            
            var widthScale = clientWidth/historyClientWidth;
            var heightScale = clientheight/historyClientHeight;

            $.map(viewInfo.itemList,function(value){
                value.itemInfo.height *= heightScale;
                value.itemInfo.width *= widthScale;
                value.itemInfo.top *= heightScale;
                value.itemInfo.left *= widthScale;
                value.itemInfo.height = Math.floor(value.itemInfo.height)
                value.itemInfo.width = Math.floor(value.itemInfo.width)
                value.itemInfo.top = Math.floor(value.itemInfo.top)
                value.itemInfo.left = Math.floor(value.itemInfo.left)
            })
            viewInfo.margin *= widthScale;
            viewInfo.clientInfo.width = clientWidth;
            viewInfo.clientInfo.height = clientheight;
            // console.log(viewInfo)
            return viewInfo;
        }

        function itemModule(opts){//drogItem模板
            var moreListStr = "";
            $.each(opts.moreList,function(index,value){
                if(value === '删除'){
                    moreListStr += '<li class="del_item">'+value+'</li>'
                }
            })
            return  '<div class="drog-item-wrap" data-id="'+opts.id+'" style="top:'+opts.itemInfo.top+'px;left:'+opts.itemInfo.left+'px;width:'+opts.itemInfo.width+'px;height:'+opts.itemInfo.height+'px">'+
                        '<div class="drog-item-inner">'+
                            '<div class="drog-item-header clear-fixed-after">'+
                                '<div class="drog-item-title">'+
                                    '<span class="drog-item-title-text">'+opts.title+'</span>'+
                                    '<i class="drog-item-title-tip iconfont icon-help"></i>'+
                                '</div>'+
                                '<div class="drog-item-tools">'+
                                    '<span class="item-tool iconfont icon-img"></span>'+
                                    '<span class="item-tool iconfont icon-fullscreen fullscreen"></span>'+
                                    '<span class="item-tool iconfont icon-more more-tools"></span>'+
                                    '<ul>'+moreListStr+'</ul>'+
                                '</div>'+
                            '</div>'+
                            '<div class="drog-item-main" style="height:'+(opts.itemInfo.height-42)+'px"></div>'+
                        '</div>'+
                        '<i class="drog-item-resize iconfont icon-arrow"></i>'+
                    '</div>'
        }

        function getCoordsByItemInfo(itemInfo){//获取drogItem的四角坐标
            var coordinate01 = [itemInfo.left,itemInfo.top];//左上
            var coordinate02 = [itemInfo.left+itemInfo.width,itemInfo.top];//右上
            var coordinate03 = [itemInfo.left+itemInfo.width,itemInfo.top+itemInfo.height];//右下
            var coordinate04 = [itemInfo.left,itemInfo.top+itemInfo.height];//左下
            return [coordinate01,coordinate02,coordinate03,coordinate04]
        }
        
        function isOverlapWidthOthers(itemDetail){//判断drogItem是否与其他重叠
            var result = false;
            var curCoords = getCoordsByItemInfo(itemDetail.itemInfo);
            $.each($this.viewInfo.itemList,function(index,value){
                if(value.id === itemDetail.id) return;
                var coords = getCoordsByItemInfo(value.itemInfo);
                var isOverlap = isOverlapBoth(curCoords,coords)
                if(isOverlap){
                    result = true
                    console.log(itemDetail.title+"与"+value.title+"重叠")
                    return false;
                }
            })
            return result;
        }

        function isOverlapBoth(coord01,coord02){//判断两个div是否有交集
            // 判断coord01在coord02的上下左右
            var isTop = coord01[2][1]<coord02[0][1]
            var isLeft = coord01[1][0]<coord02[0][0]
            var isRight = coord01[0][0]>coord02[1][0]
            var isBottom = coord01[0][1]>coord02[2][1]
            if(isTop||isLeft||isRight||isBottom){
                return false;
            }else{
                return true;
            }
        }

        function borderUponLines(itemDetail,all){//获取相邻边的距离touchSpace,all为true的时候计算到上方元素的距离，否则计算距离周边元素上方距离
            var curCoords = getCoordsByItemInfo(itemDetail.itemInfo);
            var itemDefaultMargin = $this.viewInfo.margin;
            var leftLine = curCoords[0][0];//左边的线x
            var rightLine = curCoords[1][0];//右边的线x
            var topLine = curCoords[0][1];//上边线y
            var bottomLine = curCoords[2][1];//下边线y
            var topMargins = [];
            var bottomMargins = [];
            var leftMargins = [];
            var rightMargins = [];
            $.each($this.viewInfo.itemList,function(index,value){
                if(value.id === itemDetail.id) return;
                var coords = getCoordsByItemInfo(value.itemInfo);
                var thisLeftLine = coords[0][0];//左边的线
                var thisRightLine = coords[1][0];//右边的线
                var thisTopLine = coords[0][1];//上边线
                var thisBottomLine = coords[2][1];//下边线
                var isHorizontalContain = (leftLine>=thisLeftLine&&leftLine<thisRightLine)||(rightLine>thisLeftLine&&rightLine<=thisRightLine)||(leftLine<=thisLeftLine&&rightLine>=thisRightLine) //水平区间存在交叉
                var isVerticalContain = (topLine>=thisTopLine&&topLine<thisBottomLine)||(bottomLine<=thisBottomLine&&bottomLine>thisTopLine)||(topLine<=thisTopLine&&bottomLine>=thisBottomLine)
                // console.log(isHorizontalContain)
                if(isHorizontalContain){
                    if(topLine>thisBottomLine){
                        var eachMargin = topLine-thisBottomLine;
                        topMargins.push(eachMargin);
                        console.log(itemDetail.title+"在"+value.title+"下面"+eachMargin+"px处")
                    }else{
                        var eachMargin = thisTopLine-bottomLine;
                        bottomMargins.push(eachMargin);
                        console.log(itemDetail.title+"在"+value.title+"上面"+eachMargin+"px处")
                    }

                    if((leftLine>thisLeftLine)&&!all){
                        leftMargins.push(leftLine-thisLeftLine+itemDefaultMargin);
                    }
                    if((rightLine<thisRightLine)&&!all){
                        rightMargins.push(thisRightLine-rightLine+itemDefaultMargin)
                    }
                }
                if(isVerticalContain){
                    if(leftLine>thisRightLine){
                        var eachMargin = leftLine-thisRightLine;
                        leftMargins.push(eachMargin)
                        console.log(itemDetail.title+"在"+value.title+"右面"+eachMargin+"px处")
                    }else{
                        var eachMargin = thisLeftLine-rightLine;
                        rightMargins.push(eachMargin)
                        console.log(itemDetail.title+"在"+value.title+"左面"+eachMargin+"px处")
                    }
                    if((topLine>thisTopLine)&&!all){
                        topMargins.push(topLine-thisTopLine+itemDefaultMargin)
                    }
                    if((bottomLine<thisBottomLine)&&!all){
                        bottomMargins.push(thisBottomLine-bottomLine+itemDefaultMargin)
                    }
                }
            })
            var minTopMargin,minBottomMargin,minLeftMargin,minRightMargin
            if(topMargins.length>0){
                minTopMargin = Math.min.apply(null,topMargins)
            }else{
                minTopMargin = topLine
            }
            
            if(bottomMargins.length>0){
                minBottomMargin = Math.min.apply(null,bottomMargins)
            }else{
                minBottomMargin = 1000 //下面无元素默认无限大，设置1000
            }

            if(leftMargins.length>0){
                minLeftMargin = Math.min.apply(null,leftMargins)
            }else{
                minLeftMargin = leftLine
            }

            if(rightMargins.length>0){
                minRightMargin = Math.min.apply(null,rightMargins)
            }else{
                minRightMargin = clientInfo.width - rightLine;
            }
            console.log("上侧可移动空间距离:",minTopMargin+"px")
            console.log("下侧可移动空间距离:",minBottomMargin?minBottomMargin+'px':'随意挪动')
            console.log("左侧可移动空间距离:",minLeftMargin+"px")
            console.log("右侧侧可移动空间距离:",minRightMargin+"px")
            return [minTopMargin,minRightMargin,minBottomMargin,minLeftMargin]
        }

        function getPlyingUpSize(positionDetail){//放大缩小时判断贴合方式
            var itemDefaultMargin = $this.viewInfo.margin;
            // console.log(itemDefaultMargin)
            var rightMargin = positionDetail[1];
            var bottomMargin = positionDetail[2];
            var startWidth = itemDetail.itemInfo.width;
            var startHeight = itemDetail.itemInfo.height;
            var plyingSize = [startWidth,startHeight]
            if(rightMargin<touchSpace){
                plyingSize[0] = startWidth+(rightMargin-itemDefaultMargin)
            }
            if(bottomMargin<touchSpace){
                plyingSize[1] = startHeight+(bottomMargin-itemDefaultMargin)
            }
            return plyingSize;
        }

        function getPlyingUpDirection(positionDetail){//拖动元素时判断贴合方式
            var itemDefaultMargin = $this.viewInfo.margin;
            // console.log(positionDetail)
            // console.log($this.viewInfo)
            // console.log(itemDefaultMargin)
            var topMargin = positionDetail[0];
            var rightMargin = positionDetail[1];
            var bottomMargin = positionDetail[2];
            var leftMargin = positionDetail[3];
            var spaceLess = (Math.ceil(topMargin+bottomMargin)<Math.floor(itemDefaultMargin)*2) || (Math.ceil(rightMargin+leftMargin)<Math.floor(itemDefaultMargin)*2)//空间不够用
            // console.log(spaceLess)
            var plyingUpDirection = [0,0];//x,y轴需移动距离
            if(spaceLess){
                plyingUpDirection[0] = -direction[0];
                plyingUpDirection[1] = -direction[1];
            }else{
                if(leftMargin<=rightMargin){
                    if(leftMargin<touchSpace){
                        plyingUpDirection[0]=itemDefaultMargin-leftMargin
                    }
                }else{
                    if(rightMargin<touchSpace){
                        plyingUpDirection[0]=rightMargin-itemDefaultMargin
                    }
                }

                if(topMargin<=bottomMargin){
                    if(topMargin<touchSpace){
                        plyingUpDirection[1]=itemDefaultMargin-topMargin
                    }
                }else{
                    if(bottomMargin<touchSpace){
                        plyingUpDirection[1]=bottomMargin-itemDefaultMargin
                    }
                }
                
            }
            return plyingUpDirection;
        }

        function getNewDrogItemPosition(newDrogItemDetail){//新增元素时确定元素位置
            $.each($this.viewInfo.itemList,function(index,value){
                var itemDefaultMargin = $this.viewInfo.margin;
                var borderMarginSpace = borderUponLines(value,true);
                var topMargin = borderMarginSpace[0]
                var rightMargin = borderMarginSpace[1]
                var bottomMargin = borderMarginSpace[2]
                var leftMargin = borderMarginSpace[3]
                var itemLeft = value.itemInfo.left
                var itemTop = value.itemInfo.top
                var itemWidth = value.itemInfo.width
                var itemHeight = value.itemInfo.height
                var needWidthSpace = newDrogItemDetail.itemInfo.width+Math.ceil(itemDefaultMargin)*2
                var needHeightSpace = newDrogItemDetail.itemInfo.height+Math.ceil(itemDefaultMargin)*2
                var spaceLess = (topMargin<needHeightSpace)&&(bottomMargin<needHeightSpace)&&(leftMargin<needWidthSpace)&&(rightMargin<needWidthSpace)
                if(!spaceLess){//初步确认有空间放置
                    if(leftMargin>needWidthSpace){
                        var testLeft = itemLeft-newDrogItemDetail.itemInfo.width-itemDefaultMargin
                        var testTop = itemTop
                        newDrogItemDetail.itemInfo.left = testLeft;
                        newDrogItemDetail.itemInfo.top = testTop;
                        var isOverlap = isOverlapWidthOthers(newDrogItemDetail);
                        //判断该位置是否与其他元素重叠，没有重叠就放这
                        if(!isOverlap) return false;
                    }
                    if(topMargin>needHeightSpace){
                        var testLeft = itemLeft
                        var testTop = itemTop-newDrogItemDetail.itemInfo.height-itemDefaultMargin
                        newDrogItemDetail.itemInfo.left = testLeft;
                        newDrogItemDetail.itemInfo.top = testTop;
                        var isOverlap = isOverlapWidthOthers(newDrogItemDetail);
                        //判断该位置是否与其他元素重叠，没有重叠就放这
                        if(!isOverlap) return false;
                    }

                    if(rightMargin>needWidthSpace){
                        var testLeft = itemLeft+itemWidth+itemDefaultMargin
                        var testTop = itemTop
                        newDrogItemDetail.itemInfo.left = testLeft;
                        newDrogItemDetail.itemInfo.top = testTop;
                        var isOverlap = isOverlapWidthOthers(newDrogItemDetail);
                        //判断该位置是否与其他元素重叠，没有重叠就放这
                        if(!isOverlap) return false;
                    }

                    if(bottomMargin>needHeightSpace){
                        var testLeft = itemLeft
                        var testTop = itemTop+itemHeight+itemDefaultMargin
                        newDrogItemDetail.itemInfo.left = testLeft;
                        newDrogItemDetail.itemInfo.top = testTop;
                        var isOverlap = isOverlapWidthOthers(newDrogItemDetail);
                        //判断该位置是否与其他元素重叠，没有重叠就放这
                        if(!isOverlap) return false;
                    }
                }
            })
        }

        function getRanderItemIdList(){
            var scrollTop = $window.scrollTop();
            var needRanderTopLimit = scrollTop+clientInfo.height;
            var needRanderChartIdList = []
            $.each($this.viewInfo.itemList,function(index,value){
                var itemTop = value.itemInfo.top
                var itemId = value.id
                if(itemTop<needRanderTopLimit&&itemTop>scrollTop){
                    if(hasRenderChartIdList.indexOf(itemId)<0){
                        needRanderChartIdList.push(itemId);
                        hasRenderChartIdList.push(itemId);
                    }
                }
            })
            return needRanderChartIdList
        }

        /* 初始化 */
        this.initView(this.viewInfo);
        
        /* 返回实例化对象 */
        return this;
    }
})(jQuery)