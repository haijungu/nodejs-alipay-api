//主要设计接口  
/*
线上接口:
1、线上订单创建(跳转): create_direct_pay_by_user
2、线上支付结果查询: single_trade_query
3、线上批量退款: refund_fastpay_by_platform_nopwd
4、线上退款查询: refund_fastpay_query
5、线下订单创建(二维码): alipay.trade.precreate
6、线下支付结果查询: alipay.trade.query
7、线下退款: alipay.trade.refund
8、线下退款查询: alipay.trade.fastpay.refund.query
*/
var moment = require('moment');
var fs = require('fs');
var urlencode = require('urlencode');
var iconv = require('iconv-lite');
var crypto = require('crypto');
var request = require('request');
var alib = require('../lib/alib.js');

//引入配置信息
var AlipayConfig = require('../alipay_config.json').alipay_cfg;

var AlipayNotify={
    verity:function(params,callback){
        var mysign=alib.getMySign(params);
        var sign = params["sign"]?params["sign"]:"";
        if(mysign==sign){

            var responseTxt = "true";
            if(params["notify_id"]) {
                //获取远程服务器ATN结果，验证是否是支付宝服务器发来的请求

                var partner = AlipayConfig.partner;
                var veryfy_path = AlipayConfig.HTTPS_VERIFY_PATH + "partner=" + partner + "&notify_id=" + params["notify_id"];

                requestUrl(AlipayConfig.ALIPAY_HOST1,veryfy_path,function(responseTxt){
                    if(responseTxt){
                        callback(true);
                    }else{
                        callback(false);
                    }
                });
            }
        } else{
            callback(false);
        }

        //写日志记录（若要调试，请取消下面两行注释）
        //String sWord = "responseTxt=" + responseTxt + "\n notify_url_log:sign=" + sign + "&mysign="
        //              + mysign + "\n 返回参数：" + AlipayCore.createLinkString(params);
        //AlipayCore.logResult(sWord);


        //验证
        //responsetTxt的结果不是true，与服务器设置问题、合作身份者ID、notify_id一分钟失效有关
        //mysign与sign不等，与安全校验码、请求时的参数格式（如：带自定义参数等）、编码格式有关
    }
};


var requestUrl=function(host,path,callback){
    var https = require('https');

    var options = {
        host: host,
        port: 443,
        path: path,
        method: 'GET'
    };

    var req = https.request(options, function(res) {
        console.log("statusCode: ", res.statusCode);
        console.log("headers: ", res.headers);

        res.on('data', function(d) {
            callback(d);
        });
    });
    req.end();

    req.on('error', function(e) {
        console.error(e);
    });
};
/*
 * GET home page.
 */

exports.index = function (req, res) {
    res.render('index', {layout:false, message:'线上环境' });
};

/**
 * 在应用中发送付款请求，替换掉构造form的应用
 * @param req
 * @param res
 */
exports.alipayto = function (req, res) {
// 例子; https://mapi.alipay.com/gateway.do?body=11&total_fee=0.01&subject=11&sign_type=MD5&service=create_direct_pay_by_user&notify_url=http%3A%2F%2Fwww.xxx.cn%2Fcreate_direct_pay_by_user_jsp_utf8%2Fnotify_url.jsp&out_trade_no=20120607141151&payment_type=1&show_url=http%3A%2F%2Fwww.xxx.com%2Forder%2Fmyorder.jsp&return_url=http%3A%2F%2F127.0.0.1%3A8080%2Fcreate_direct_pay_by_user_jsp_utf8%2Freturn_url.jsp
//                                   /gateway.do?body=11&notify_url=http://www.xxx.cn/create_direct_pay_by_user_jsp_utf8/notify_url.jsp&out_trade_no=20120708132324&payment_type=1&return_url=http://127.0.0.1:8080/create_direct_pay_by_user_jsp_utf8/return_url.jsp&service=create_direct_pay_by_user&show_url=http://www.xxx.com/order/myorder.jsp&subject=11&total_fee=0.01&sign=dfc1995af2ff01642a3cf6936ce0d57c&sign_type=MD5
    ////////////////////////////////////请求参数//////////////////////////////////////

    //必填参数//
    //可甜参数
    //请与贵网站订单系统中的唯一订单号匹配
    var out_trade_no = req.body.outno;
    //订单名称，显示在支付宝收银台里的“商品名称”里，显示在支付宝的交易管理的“商品名称”的列表里。
    var subject = req.body.subject;
    //订单描述、订单详细、订单备注，显示在支付宝收银台里的“商品描述”里
    var body = req.body.alibody;
    //订单总金额，显示在支付宝收银台里的“应付总额”里
    var total_fee = req.body.total_fee;

    //扩展功能参数——默认支付方式//

    //默认支付方式，取值见“即时到帐接口”技术文档中的请求参数列表
    var paymethod = "";
    //默认网银代号，代号列表见“即时到帐接口”技术文档“附录”→“银行列表”
    var defaultbank = "";

    //扩展功能参数——防钓鱼//

    //防钓鱼时间戳
    var anti_phishing_key = "";
    //获取客户端的IP地址，建议：编写获取客户端IP地址的程序
    var exter_invoke_ip = "";
    //注意：
    //1.请慎重选择是否开启防钓鱼功能
    //2.exter_invoke_ip、anti_phishing_key一旦被设置过，那么它们就会成为必填参数
    //3.开启防钓鱼功能后，服务器、本机电脑必须支持远程XML解析，请配置好该环境。
    //4.建议使用POST方式请求数据
    //示例：
    //anti_phishing_key = AlipayService.query_timestamp();	//获取防钓鱼时间戳函数
    //exter_invoke_ip = "127.0.0.1";

    //扩展功能参数——其他///

    //自定义参数，可存放任何内容（除=、&等特殊字符外），不会显示在页面上
    var extra_common_param = "";
    //默认买家支付宝账号
    var buyer_email = "15651633150";
    //商品展示地址，要用http:// 格式的完整路径，不允许加?id=123这类自定义参数
    var show_url = "http://www.baidu.com";

    //扩展功能参数——分润(若要使用，请按照注释要求的格式赋值)//

    //提成类型，该值为固定值：10，不需要修改
    var royalty_type = "";
    //提成信息集
    var royalty_parameters = "";
    //注意：
    //与需要结合商户网站自身情况动态获取每笔交易的各分润收款账号、各分润金额、各分润说明。最多只能设置10条
    //各分润金额的总和须小于等于total_fee
    //提成信息集格式为：收款方Email_1^金额1^备注1|收款方Email_2^金额2^备注2
    //示例：
    //royalty_type = "10"
    //royalty_parameters	= "111@126.com^0.01^分润备注一|222@126.com^0.01^分润备注二"

    //////////////////////////////////////////////////////////////////////////////////

    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["payment_type", "1"]);
    sParaTemp.push(["out_trade_no", out_trade_no]);
    sParaTemp.push(["subject", subject]);
    sParaTemp.push(["body", body]);
    sParaTemp.push(["total_fee", total_fee]);
//    sParaTemp.push(["show_url", show_url]);
    sParaTemp.push(["paymethod", paymethod]);
    sParaTemp.push(["defaultbank", defaultbank]);
    sParaTemp.push(["anti_phishing_key", anti_phishing_key]);
    sParaTemp.push(["exter_invoke_ip", exter_invoke_ip]);
    sParaTemp.push(["extra_common_param", extra_common_param]);
    sParaTemp.push(["buyer_email", buyer_email]);
    sParaTemp.push(["royalty_type", royalty_type]);
    sParaTemp.push(["royalty_parameters", royalty_parameters]);

    //增加基本配置
    sParaTemp.push(["service", "create_direct_pay_by_user"]);
    sParaTemp.push(["sign_type", "MD5"]);
    sParaTemp.push(["partner", AlipayConfig.partner]);
    //sParaTemp.push(["return_url", AlipayConfig.return_url]);
    //sParaTemp.push(["notify_url", AlipayConfig.notify_url]);
    sParaTemp.push(["seller_email", AlipayConfig.seller_email]);
    sParaTemp.push(["_input_charset", AlipayConfig.input_charset]);


    //待请求参数数组
    var sPara = alib.buildRequestPara(sParaTemp);
    var path=AlipayConfig.ALIPAY_PATH;


    //构造函数，生成请求URL
    var sURL = alib.getPath(path, sPara);
    console.log("https://"+AlipayConfig.ALIPAY_HOST1+"/"+sURL);
    //向支付宝网关发出请求
   // requestUrl(AlipayConfig.ALIPAY_HOST1,sURL,function(data){
   //     console.log(data);
   // });
    res.redirect("https://"+AlipayConfig.ALIPAY_HOST1+"/"+sURL);
};

exports.singlequery = function(req, res){
    var partner = AlipayConfig.partner;
    var service = "single_trade_query";
    var _input_charset = "UTF-8";
    var sign_type = "MD5";
    var out_trade_no = req.query.outno;
    var trade_no ="";

    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["partner", partner]);
    sParaTemp.push(["service", service]);
    sParaTemp.push(["_input_charset", _input_charset]);
    sParaTemp.push(["sign_type", sign_type]);
    sParaTemp.push(["out_trade_no", out_trade_no]);
    //sParaTemp.push(["timestamp", '2017-01-16 16:16:53']);
    sParaTemp.push(["trade_no", trade_no]);
    //sParaTemp.push(["biz_content", biz_content]);

    var sPara = alib.buildRequestPara(sParaTemp);
    var path=AlipayConfig.ALIPAY_PATH;

    var sURL = alib.getPath(path, sPara);
    console.log('sURL', "https://mapi.alipay.com/"+sURL);
    //res.send("https://openapi.alipay.com/"+sURL);
    //res.redirect("https://openapi.alipay.com/"+sURL);
    request({
        url:"https://mapi.alipay.com/"+sURL,
        method:'GET',
        headers: { 'content-type': 'application/json'
    }},function(error, response, body){
        console.log("支付宝返回内容:\n", body);

        var parse = new require('xml2js').Parser({explicitArray: false});

        parse.parseString(body, function(err,result){
            var data_json = result;

            if(data_json.alipay.is_success == 'F'){
                var wholestring = "<style>span {color: red;}</style><br><div> \
                【请求是否成功】<label>is_success:</label><span>"+data_json.alipay.is_success+"</span><br /> \
                【合作者身份ID】<label>error:</label><span>"+data_json.alipay.error+"</span><br /> </div>";
                res.send(wholestring);
                
            } else {

                var check_res = alib.checkMD5(data_json.alipay.response.trade, data_json.alipay.sign);

                var response = data_json.alipay.response.trade;
                var wholestring = "<style>span {color: red;}</style><br><div> \
                【请求是否成功】<label>is_success:</label><span>"+data_json.alipay.is_success+"</span><br /> \
                【合作者身份ID】<label>partner:</label><span>"+AlipayConfig.partner+"</span><br /> \
                【买家支付宝帐号】<label>buyer_email:</label><span>"+response.buyer_email+"</span><br /> \
                【买家支付宝账号对应的支付宝唯一用户号】<label>buyer_id:</label><span>"+response.buyer_id+"</span><br /> \
                【折扣】<label>discount:</label><span>"+response.discount+"</span><br /> \
                【交易冻结状态】<label>flag_trade_locked:</label><span>"+response.flag_trade_locked+"</span><br />  \
                【交易创建时间】<label>gmt_create:</label><span>"+response.gmt_create+"</span><br /> \
                【交易最近一次修改时间】<label>gmt_last_modified_time:</label><span>"+response.gmt_last_modified_time+"</span><br /> \
                【付款时间】<label>gmt_payment:</label><span>"+response.gmt_payment+"</span><br /> \
                【交易金额是否调整过】<label>is_total_fee_adjust:</label><span>"+response.is_total_fee_adjust+"</span><br /> \
                【交易的创建人角色】<label>operator_role:</label><span>"+response.operator_role+"</span><br /> \
                【商家订单号】<label>out_trade_no:</label><span>"+response.out_trade_no+"</span><br /> \
                【收款类型】<label>payment_type:</label><span>"+response.payment_type+"</span><br /> \
                【商品单价】<label>price:</label><span>"+response.price+"</span><br /> \
                【购买数量】<label>quantity:</label><span>"+response.quantity+"</span><br /> \
                【卖家支付宝账号】<label>seller_email:</label><span>"+response.seller_email+"</span><br /> \
                【卖家支付宝账号对应的支付宝唯一用户号】<label>seller_id:</label><span>"+response.seller_id+"</span><br /> \
                【商品名称】<label>subject:</label><span>"+response.subject+"</span><br /> \
                【主超时时间】<label>time_out:</label><span>"+response.time_out+"</span><br /> \
                【超时类型】<label>time_out_type:</label><span>"+response.time_out_type+"</span><br /> \
                【累计已退款金额】<label>to_buyer_fee:</label><span>"+response.to_buyer_fee+"</span><br /> \
                【累计已付给卖家的金额】<label>to_seller_fee:</label><span>"+response.to_seller_fee+"</span><br /> \
                【交易总金额】<label>total_fee:</label><span>"+response.total_fee+"</span><br /> \
                【支付宝交易号】<label>trade_no:</label><span>"+response.trade_no+"</span><br /> \
                【交易状态】<label>trade_status:</label><span>"+response.trade_status+"</span><br /> \
                【是否使用过红包】<label>use_coupon:</label><span>"+response.use_coupon+"</span><br /></div>";

                res.send(wholestring);
            }

        });
    })

}

exports.refundfastpay = function(req, res){
    var partner = AlipayConfig.partner;
    var service = "refund_fastpay_by_platform_nopwd";
    var sign_type = "MD5";
    var _input_charset = "UTF-8";
    var batch_no = moment().format("YYYYMMDD") + req.query.outno;
    var refund_date = moment().format("YYYY-MM-DD HH:mm:ss");
    var batch_num = 1;
    var detail_data = req.query.tradeno+"^0.01^gaoxing";

    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["partner", partner]);
    sParaTemp.push(["service", service]);
    sParaTemp.push(["_input_charset", _input_charset]);
    sParaTemp.push(["sign_type", sign_type]);
    sParaTemp.push(["batch_no", batch_no]);
    sParaTemp.push(["batch_num", batch_num]);
    sParaTemp.push(["refund_date", refund_date]);
    sParaTemp.push(["detail_data", detail_data]);

    var sPara = alib.buildRequestPara(sParaTemp);
    var path=AlipayConfig.ALIPAY_PATH;

    var sURL = alib.getPath(path, sPara);
    console.log('sURL', "https://mapi.alipay.com/"+sURL);
    //res.send("https://openapi.alipay.com/"+sURL);
    //res.redirect("https://openapi.alipay.com/"+sURL);
    request({
        url:"https://mapi.alipay.com/"+sURL,
        method:'GET',
        headers: { 'content-type': 'application/json'
    }},function(error, response, body){
        console.log("支付宝返回内容:\n", body);

        var parse = new require('xml2js').Parser({explicitArray: false});

        parse.parseString(body, function(err,result){
            var data_json = result;

            var wholestring = "<style>span {color: red;}</style><div> <br>\
                【请求是否成功】<label>is_success:</label><span>"+data_json.alipay.is_success+"</span> <br >\
                【报错了没】<label>error:</label><span>"+data_json.alipay.error+"</span></div>";

            res.send(wholestring);

        });
    })

}

exports.refundfastquery = function(req, res){
    var partner = AlipayConfig.partner;
    var service = "refund_fastpay_query";
    var sign_type = "MD5";
    var _input_charset = "UTF-8";
    var batch_no = moment().format("YYYYMMDD") + req.query.outno;
    var trade_no = req.query.tradeno;
    var refund_date = moment().format("YYYY-MM-DD HH:mm:ss");

    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["partner", partner]);
    sParaTemp.push(["service", service]);
    sParaTemp.push(["_input_charset", _input_charset]);
    sParaTemp.push(["sign_type", sign_type]);
    sParaTemp.push(["batch_no", batch_no]);
    sParaTemp.push(["trade_no", trade_no]);

    var sPara = alib.buildRequestPara(sParaTemp);
    var path=AlipayConfig.ALIPAY_PATH;

    var sURL = alib.getPath(path, sPara);
    console.log('sURL', "https://mapi.alipay.com/"+sURL);
    //res.send("https://openapi.alipay.com/"+sURL);
    //res.redirect("https://openapi.alipay.com/"+sURL);
    request({
        url:"https://mapi.alipay.com/"+sURL,
        method:'GET',
        headers: { 'content-type': 'application/json'
    }},function(error, response, body){
        console.log("支付宝返回内容:\n", body);

        var parse = new require('xml2js').Parser({explicitArray: false});

        parse.parseString(body, function(err,result){
            var data_json = result;

            var wholestring = "<style>span {color: red;}</style><div> <br>\
                【请求是否成功】<label>is_success:</label><span>"+data_json.alipay.is_success+"</span> <br >\
                【报错了没】<label>error:</label><span>"+data_json.alipay.error+"</span></div>";

            res.send(wholestring);

        });
    })

}

exports.precreate = function(req, res){
    var app_id = AlipayConfig.app_id;
    var method = "alipay.trade.precreate";
    var charset = AlipayConfig.input_charset;
    var sign_type = "RSA";
    var timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
    var format = "json";
    var version = "1.0";
    var out_trade_no = req.query.outno;
    var biz_content = {
            out_trade_no : out_trade_no,
            total_amount: req.query.total_fee,
            subject : req.query.subject,
            timeout_express : "10m"
    }
    
    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["app_id", app_id]);
    sParaTemp.push(["method", method]);
    sParaTemp.push(["charset", charset]);
    sParaTemp.push(["sign_type", sign_type]);
    sParaTemp.push(["timestamp", timestamp]);
    sParaTemp.push(["format", format]);
    sParaTemp.push(["version", version]);
    sParaTemp.push(["notify_url", AlipayConfig.notify_url]);
    sParaTemp.push(["biz_content", JSON.stringify(biz_content)]);
    

    var sPara = alib.buildRequestPara2(sParaTemp);

    var path = AlipayConfig.ALIPAY_PATH;

    var sURL = alib.getPath(path, sPara);
    console.log('sURL', "https://openapi.alipay.com/"+sURL);

    request({
        url: "https://openapi.alipay.com/"+sURL,
        method: 'GET',
        headers: { 
                    'charset': 'utf-8'
            }
        },function(error, response, body){
            console.log("支付宝返回内容:\n", body);
            body = JSON.parse(body);

            var result = alib.checkRSA(body.alipay_trade_precreate_response, body.sign);
            var response = body.alipay_trade_precreate_response;

            var qr_img = "";
            if(response.code !== "10000"){
                qr_img = "";
            } else {
                qr_img = 'http://qr.liantu.com/api.php?&w=200&text='+response.qr_code;
            }
            
            var wholestring = "<style>span {color: red;}</style><div> \
                【网关返回码】<label>code:</label><span>"+response.code+"</span><br /> \
                【网关返回描述】<label>msg:</label><span>"+response.msg+"</span><br /> \
                【网关返回子码】<label>sub_code:</label><span>"+response.sub_code+"</span><br /> \
                【网关返回子描述】<label>sub_msg:</label><span>"+response.sub_msg+"</span><br />  \
                【创建交易传入的商户订单号】<label>out_trade_no:</label><span>"+response.out_trade_no+"</span><br /> \
                【二维码地址】<label>qr_code:</label><span>"+response.qr_code+"</span><br /> \
                 <h2>支付宝扫码支付</h2><img src=" + qr_img + "></div>"

            res.send(wholestring);
    })

}

exports.payquery = function(req, res){
    var app_id = AlipayConfig.app_id;
    var method = "alipay.trade.query";
    var charset = "UTF-8";
    var sign_type = "RSA";
    var timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
    var format = "json";
    var version = "1.0";
    var out_trade_no = req.query.outno;
    var biz_content = {
        out_trade_no :out_trade_no,
        trade_no :""
        }
    // var biz_content = [];
    // biz_content.push(["out_trade_no", '201701160101000012']);
    // biz_content.push(["seller_id", '2088201564809153']);
    // biz_content.push(["total_amount", 10.00]);
    // biz_content.push(["subject", '商品']);
    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["app_id", app_id]);
    sParaTemp.push(["method", method]);
    sParaTemp.push(["charset", charset]);
    sParaTemp.push(["sign_type", sign_type]);
    sParaTemp.push(["timestamp", timestamp]);
    //sParaTemp.push(["timestamp", '2017-01-16 16:16:53']);
    sParaTemp.push(["format", format]);
    sParaTemp.push(["version", version]);
    sParaTemp.push(["biz_content", JSON.stringify(biz_content)]);
    //sParaTemp.push(["biz_content", biz_content]);

    var sPara = alib.buildRequestPara2(sParaTemp);

    var path = AlipayConfig.ALIPAY_PATH;

    var sURL = alib.getPath(path, sPara);
    console.log('sURL', "https://openapi.alipay.com/"+sURL);
    //res.send("https://openapi.alipay.com/"+sURL);
    //res.redirect("https://openapi.alipay.com/"+sURL);
    request({
        url:"https://openapi.alipay.com/"+sURL,
        method:'GET',
        headers: { 'content-type': 'application/json'
    }},function(error, response, body){
        console.log("支付宝返回内容:\n", body);
        body = JSON.parse(body);

        var result = alib.checkRSA(body.alipay_trade_query_response, body.sign);

        var response = body.alipay_trade_query_response;
        var wholestring = "<style>span {color: red;}</style><div> \
            【网关返回码】<label>code:</label><span>"+response.code+"</span><br /> \
            【网关返回描述】<label>msg:</label><span>"+response.msg+"</span><br /> \
            【网关返回子码】<label>sub_code:</label><span>"+response.sub_code+"</span><br /> \
            【网关返回子描述】<label>sub_msg:</label><span>"+response.sub_msg+"</span><br />  \
            【买家支付宝账号】<label>buyer_logon_id:</label><span>"+response.buyer_logon_id+"</span><br /> \
            【买家实付金额】<label>buyer_pay_amount:</label><span>"+response.buyer_pay_amount+"</span><br /> \
            【买家在支付宝的用户id】<label>buyer_user_id:</label><span>"+response.buyer_user_id+"</span><br /> ";

        if(response.fund_bill_list){
            wholestring = wholestring + "【交易支付使用的资金渠道】<label>fund_bill_list:</label><span>【该支付工具类型所使用的金额】"+response.fund_bill_list[0].amount+"【交易使用的资金渠道】"+response.fund_bill_list[0].fund_channel+"</span><br /> ";
        }
        
        wholestring = wholestring +"【交易中用户支付的可开具发票的金额】<label>invoice_amount:</label><span>"+response.invoice_amount+"</span><br /> \
            【买家支付宝用户号】<label>open_id:</label><span>"+response.open_id+"</span><br /> \
            【商家订单号】<label>out_trade_no:</label><span>"+response.out_trade_no+"</span><br /> \
            【积分支付的金额】<label>point_amount:</label><span>"+response.point_amount+"</span><br /> \
            【实收金额】<label>receipt_amount:</label><span>"+response.receipt_amount+"</span><br /> \
            【本次交易打款给卖家的时间】<label>send_pay_date:</label><span>"+response.send_pay_date+"</span><br /> \
            【交易的订单金额】<label>total_amount:</label><span>"+response.total_amount+"</span><br /> \
            【支付宝交易号】<label>trade_no:</label><span>"+response.trade_no+"</span><br /> \
            【交易状态】<label>trade_status:</label><span>"+response.trade_status+"</span><br /></div>";

        res.send(wholestring);
    })

}




exports.traderefund = function(req, res){
    var app_id = AlipayConfig.app_id;
    var method = "alipay.trade.refund";
    var charset = "utf-8";
    var sign_type = "RSA";
    var timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
    var format = "json";
    var version = "1.0";
    var biz_content = {
        out_trade_no : req.query.outno,
        trade_no :"",
        refund_amount : req.query.total_fee
    }

    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["app_id", app_id]);
    sParaTemp.push(["method", method]);
    sParaTemp.push(["charset", charset]);
    sParaTemp.push(["sign_type", sign_type]);
    sParaTemp.push(["timestamp", timestamp]);
    //sParaTemp.push(["timestamp", '2017-01-16 16:16:53']);
    sParaTemp.push(["format", format]);
    sParaTemp.push(["version", version]);
    sParaTemp.push(["biz_content", JSON.stringify(biz_content)]);
    //sParaTemp.push(["biz_content", biz_content]);

    var sPara = alib.buildRequestPara2(sParaTemp);

    var path = AlipayConfig.ALIPAY_PATH;

    var sURL = alib.getPath(path, sPara);
    console.log('sURL', "https://openapi.alipay.com/"+sURL);
    //res.send("https://openapi.alipay.com/"+sURL);
    //res.redirect("https://openapi.alipay.com/"+sURL);

    var request = require('request');
    request({
        url:"https://openapi.alipay.com/"+sURL,
        method:'GET',
        headers: { 
                    'charset': 'utf-8'
    }},function(error, response, body){
        console.log("支付宝返回内容:\n", body);
        body = JSON.parse(body);

        var result = alib.checkRSA(body.alipay_trade_refund_response, body.sign);

        var response = body.alipay_trade_refund_response;
        var wholestring = "<style>span {color: red;}</style><div> \
            【网关返回码】<label>code:</label><span>"+response.code+"</span><br /> \
            【网关返回描述】<label>msg:</label><span>"+response.msg+"</span><br /> \
            【网关返回子码】<label>sub_code:</label><span>"+response.sub_code+"</span><br /> \
            【网关返回子描述】<label>sub_msg:</label><span>"+response.sub_msg+"</span><br />  \
            【用户的登录id】<label>buyer_logon_id:</label><span>"+response.buyer_logon_id+"</span><br /> \
            【买家在支付宝的用户id】<label>buyer_user_id:</label><span>"+response.buyer_user_id+"</span><br /> \
            【本次退款是否发生了资金变化】<label>fund_change:</label><span>"+response.fund_change+"</span><br /> \
            【退款支付时间】<label>gmt_refund_pay:</label><span>"+response.gmt_refund_pay+"</span><br /> \
            【买家支付宝用户号】<label>open_id:</label><span>"+response.open_id+"</span><br /> \
            【商户订单号】<label>out_trade_no:</label><span>"+response.out_trade_no+"</span><br /> ";

        if(response.refund_detail_item_list){
            wholestring = wholestring + "【退款使用的资金渠道】<label>refund_detail_item_list:</label><span>【该支付工具类型所使用的金额】"+response.refund_detail_item_list[0].amount+"【交易使用的资金渠道】"+response.refund_detail_item_list[0].fund_channel+"</span><br />";
        }
        wholestring = wholestring +"【退款总金额】<label>refund_fee:</label><span>"+response.refund_fee+"</span><br /> \
            【实际退款金额】<label>send_back_fee:</label><span>"+response.send_back_fee+"</span><br /> \
            【支付宝交易号】<label>trade_no:</label><span>"+response.trade_no+"</span><br /> \</div>";

        res.send(wholestring);
    })

}

exports.refundquery = function(req, res){
    var app_id = AlipayConfig.app_id;
    var method = "alipay.trade.fastpay.refund.query";
    var charset = "UTF-8";
    var sign_type = "RSA";
    var timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
    var format = "json";
    var version = "1.0";
    var out_trade_no = req.query.outno;
    var biz_content = {
        out_trade_no : out_trade_no,
        trade_no :"",
        out_request_no: out_trade_no
    }

    //把请求参数打包成数组
    var sParaTemp = [];
    sParaTemp.push(["app_id", app_id]);
    sParaTemp.push(["method", method]);
    sParaTemp.push(["charset", charset]);
    sParaTemp.push(["sign_type", sign_type]);
    sParaTemp.push(["timestamp", timestamp]);
    //sParaTemp.push(["timestamp", '2017-01-16 16:16:53']);
    sParaTemp.push(["format", format]);
    sParaTemp.push(["version", version]);
    sParaTemp.push(["biz_content", JSON.stringify(biz_content)]);
    //sParaTemp.push(["biz_content", biz_content]);

    var sPara = alib.buildRequestPara2(sParaTemp);

    var path = AlipayConfig.ALIPAY_PATH;

    var sURL = alib.getPath(path, sPara);
    console.log('sURL', "https://openapi.alipay.com/"+sURL);

    //res.send("https://openapi.alipay.com/"+sURL);
    //res.redirect("https://openapi.alipay.com/"+sURL);
    request({
        url:"https://openapi.alipay.com/"+sURL,
        method:'GET',
        headers: { 'content-type': 'application/json'
    }},function(error, response, body){
        console.log("支付宝返回内容:\n", body);
        body = JSON.parse(body);

        var result = alib.checkRSA(body.alipay_trade_fastpay_refund_query_response, body.sign);    

        var response = body.alipay_trade_fastpay_refund_query_response;
        var wholestring = "<style>span {color: red;}</style><div> \
            【网关返回码】<label>code:</label><span>"+response.code+"</span><br /> \
            【网关返回描述】<label>msg:</label><span>"+response.msg+"</span><br /> \
            【网关返回子码】<label>sub_code:</label><span>"+response.sub_code+"</span><br /> \
            【网关返回子描述】<label>sub_msg:</label><span>"+response.sub_msg+"</span><br />  \
            【本笔退款对应的退款请求号】<label>out_request_no:</label><span>"+response.out_request_no+"</span><br /> \
            【创建交易传入的商户订单号】<label>out_trade_no:</label><span>"+response.out_trade_no+"</span><br /> \
            【本次退款请求，对应的退款金额】<label>refund_amount:</label><span>"+response.refund_amount+"</span><br /> \
            【该笔退款所对应的交易的订单金额】<label>total_amount:</label><span>"+response.total_amount+"</span><br /> \
            【支付宝交易号】<label>trade_no:</label><span>"+response.trade_no+"</span><br /> \</div>";

        res.send(wholestring);
    })

}


exports.paynotify = function(req, res){
    //http://127.0.0.1:3000/paynotify?trade_no=2008102203208746&out_trade_no=3618810634349901&discount=-5&payment_type=1&subject=iphone%E6%89%8B%E6%9C%BA&body=Hello&price=10.00&quantity=1&total_fee=10.00&trade_status=TRADE_FINISHED&refund_status=REFUND_SUCCESS&seller_email=chao.chenc1%40alipay.com&seller_id=2088002007018916&buyer_id=2088002007013600&buyer_email=13758698870&gmt_create=2008-10-22+20%3A49%3A31&is_total_fee_adjust=N&gmt_payment=2008-10-22+20%3A49%3A50&gmt_close=2008-10-22+20%3A49%3A46&gmt_refund=2008-10-29+19%3A38%3A25&use_coupon=N&notify_time=2009-08-12+11%3A08%3A32&notify_type=%E4%BA%A4%E6%98%93%E7%8A%B6%E6%80%81%E5%90%8C%E6%AD%A5%E9%80%9A%E7%9F%A5%28trade_status_sync%29&notify_id=70fec0c2730b27528665af4517c27b95&sign_type=DSA&sign=_p_w_l_h_j0b_gd_aejia7n_ko4_m%252Fu_w_jd3_nx_s_k_mxus9_hoxg_y_r_lunli_pmma29_t_q%253D%253D&extra_common_param=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E8%BF%99%E6%98%AF%E6%B5%8B%E8%AF%95%E5%95%86%E6%88%B7%E7%9A%84%E5%B9%BF%E5%91%8A%E3%80%82
    //获取支付宝的通知返回参数，可参考技术文档中页面跳转同步通知参数列表(以下仅供参考)//

    console.log("paynotify:", req.query);
    var params = req.query;
//    console.log(req.query());
    var trade_no = req.query.trade_no;              //支付宝交易号
    var order_no = req.query.out_trade_no;          //获取订单号
    var total_fee = req.query.total_fee;            //获取总金额
    var subject = req.query.subject;//商品名称、订单名称
    var body = "";
    if(req.query.body != null){
        body = req.query.body;//商品描述、订单备注、描述
    }
    var buyer_email = req.query.buyer_email;        //买家支付宝账号
    var trade_status = req.query.trade_status;      //交易状态
    //获取支付宝的通知返回参数，可参考技术文档中页面跳转同步通知参数列表(以上仅供参考)//
    AlipayNotify.verity(params,function(result){
        if(result){
            //////////////////////////////////////////////////////////////////////////////////////////
            //请在这里加上商户的业务逻辑程序代码

            //——请根据您的业务逻辑来编写程序（以下代码仅作参考）——

            if(trade_status=="TRADE_FINISHED"){
                //判断该笔订单是否在商户网站中已经做过处理
                //如果没有做过处理，根据订单号（out_trade_no）在商户网站的订单系统中查到该笔订单的详细，并执行商户的业务程序
                //如果有做过处理，不执行商户的业务程序

                //注意：
                //该种交易状态只在两种情况下出现
                //1、开通了普通即时到账，买家付款成功后。
                //2、开通了高级即时到账，从该笔交易成功时间算起，过了签约时的可退款时限（如：三个月以内可退款、一年以内可退款等）后。
            } else if (trade_status=="TRADE_SUCCESS"){
                //判断该笔订单是否在商户网站中已经做过处理
                //如果没有做过处理，根据订单号（out_trade_no）在商户网站的订单系统中查到该笔订单的详细，并执行商户的业务程序
                //如果有做过处理，不执行商户的业务程序

                //注意：
                //该种交易状态只在一种情况下出现——开通了高级即时到账，买家付款成功后。
            }

            //——请根据您的业务逻辑来编写程序（以上代码仅作参考）——

            res.end("success"); //请不要修改或删除——

            //////////////////////////////////////////////////////////////////////////////////////////
        } else{
            res.end("fail");
        }

    });
};

//http://127.0.0.1:3000/payreturn?is_success=T&sign=b1af584504b8e845ebe40b8e0e733729&sign_type=MD5&body=Hello&buyer_email=xinjie_xj%40163.com&buyer_id=2088101000082594&exterface=create_direct_pay_by_user&out_trade_no=6402757654153618&payment_type=1&seller_email=chao.chenc1%40alipay.com&seller_id=2088002007018916&subject=%E5%A4%96%E9%83%A8FP&total_fee=10.00&trade_no=2008102303210710&trade_status=TRADE_FINISHED&notify_id=RqPnCoPT3K9%252Fvwbh3I%252BODmZS9o4qChHwPWbaS7UMBJpUnBJlzg42y9A8gQlzU6m3fOhG&notify_time=2008-10-23+13%3A17%3A39&notify_type=trade_status_sync&extra_common_param=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E8%BF%99%E6%98%AF%E6%B5%8B%E8%AF%95%E5%95%86%E6%88%B7%E7%9A%84%E5%B9%BF%E5%91%8A%E3%80%82
exports.payreturn=function(req,res){
    //获取支付宝的通知返回参数，可参考技术文档中页面跳转同步通知参数列表(以下仅供参考)//
    var params=req.query;


//    console.log(req.query());
    var trade_no = req.query.trade_no;              //支付宝交易号
    var order_no = req.query.out_trade_no;          //获取订单号
    var total_fee = req.query.total_fee;            //获取总金额
    var subject = req.query.subject;//商品名称、订单名称
    var body = "";
    if(req.query.body != null){
        body = req.query.body;//商品描述、订单备注、描述
    }
    var buyer_email = req.query.buyer_email;        //买家支付宝账号
    var trade_status = req.query.trade_status;      //交易状态
    //获取支付宝的通知返回参数，可参考技术文档中页面跳转同步通知参数列表(以上仅供参考)//

    AlipayNotify.verity(params,function(result){
        //如果成功，插入表记录
        if(result){
            //////////////////////////////////////////////////////////////////////////////////////////
            //请在这里加上商户的业务逻辑程序代码

            //——请根据您的业务逻辑来编写程序（以下代码仅作参考）——

            if(trade_status=="TRADE_FINISHED"){
                //判断该笔订单是否在商户网站中已经做过处理
                //如果没有做过处理，根据订单号（out_trade_no）在商户网站的订单系统中查到该笔订单的详细，并执行商户的业务程序
                //如果有做过处理，不执行商户的业务程序

                //注意：
                //该种交易状态只在两种情况下出现
                //1、开通了普通即时到账，买家付款成功后。
                //2、开通了高级即时到账，从该笔交易成功时间算起，过了签约时的可退款时限（如：三个月以内可退款、一年以内可退款等）后。
            } else if (trade_status=="TRADE_SUCCESS"){
                //判断该笔订单是否在商户网站中已经做过处理
                //如果没有做过处理，根据订单号（out_trade_no）在商户网站的订单系统中查到该笔订单的详细，并执行商户的业务程序
                //如果有做过处理，不执行商户的业务程序

                //注意：
                //该种交易状态只在一种情况下出现——开通了高级即时到账，买家付款成功后。
            }

            //——请根据您的业务逻辑来编写程序（以上代码仅作参考）——

            res.end("success"); //请不要修改或删除——

            //////////////////////////////////////////////////////////////////////////////////////////
        } else{
            res.end("fail");
        }

    });
};













