var request = require('request');
var crypto = require('crypto');
var fs = require('fs');
var urlencode = require('urlencode');
var iconv = require('iconv-lite');
var https = require('https');
var async = require('async');




function getback(){
var back;
async.series([

	function(cb){
		request({
		url:'https://openapi.alipay.com/gateway.do?app_id=2016030101172374&biz_content=%7B%22out_trade_no%22%3A%2254564654%22%2C%22trade_no%22%3A%2254564654%22%7D&charset=utf-8&format=JSON&method=alipay.trade.query&notify_url=http%3A%2F%2F127.0.0.1%3A3000%2Fpaynotify&sign_type=RSA&timestamp=2017-01-22%2014%3A30%3A44&version=1.0&sign=DVbnghlWrIMlmx1jJFlpTB%2FRTYku%2F%2Bg5xpZ8E7EKvZE47UtwPeIdMgHZq8OmHXB91QnQdx4FvW2QQu5Ok5fkc3zf5g4WpMogjD0PyR7kp%2By4iVcYxobb%2BsAGiDiSL35939WA%2FDLHMqZGYJVWSNa7E0q4bCQkx3%2F9KSvLemgBh4A%3D',
		method:'GET',
        headers: { 'content-type': 'application/json'
	}},function(error, response, body){
		console.log("支付宝返回内容:\n", body);
		body = JSON.parse(body);
		
	    //把请求参数打包成数组
	    var sParaTemp = [];
	    sParaTemp.push(["code", body.alipay_trade_precreate_response.code]);
	    sParaTemp.push(["msg", body.alipay_trade_precreate_response.msg]);
	    sParaTemp.push(["sub_code", body.alipay_trade_precreate_response.out_trade_no]);
	    sParaTemp.push(["sub_msg", body.alipay_trade_precreate_response.qr_code]);

	    

	    var buildRequestPara = function (sParaTemp) {
	        //生成签名结果
	        //把数组所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
	        // for (var i2 = 0; i2 < sPara.length; i2++) {
	        //     var obj = sPara[i2];
	        //     if (i2 == sPara.length - 1) {
	        //         prestr = prestr + obj[0] + "=" + obj[1];
	        //     } else {
	        //         prestr = prestr + obj[0] + "=" + obj[1] + "&";
	        //     }

	        // }

	        var prestr = JSON.stringify(body.alipay_trade_precreate_response);
	        console.log("12312",body.alipay_trade_precreate_response.qr_code);
	        var decode_prestr = prestr ;//= urlencode.encode(prestr);

	        //decode_prestr.replace( '/', '\/');
	        decode_prestr = '{"code":"10000","msg":"Success","out_trade_no":"201701160101000046","qr_code":"https:\\/\\/qr.alipay.com\\/bax05303boze2yfanbzc803e"}';
	        var buf = new Buffer(decode_prestr);
	        var sign_text = body.sign;
	        sign_text = 'B4UCO/148GT8ovvY5aj45ojpZ2SWFdBctNWxnNo8JLyxLAK1+w9d+O/dl27Fjjlvc9mbTUl2gzto49ZF9R2FghAUKfhUvYBSaqvyj4mzK4zzkKMNpb14VM3FypnjI3JtvrRrzPRjqSXh/AcxF/zzC34qp71DoKAUWLuYaNC8PXc=';
	        console.log("待验签内容:\n",decode_prestr, "\n支付宝返回Sign值:\n", sign_text);
	        var publicPem = fs.readFileSync(__dirname + '/rsa_public_key.pem');
	        var pubkey = publicPem.toString();
	        console.log();
			//解密
			var check = crypto.createVerify('RSA-SHA1');
			check.update(buf);
			//console.log("验签结果:\n",check.verify(pubkey, sign_text, 'base64'));
			return "验签结果:"+check.verify(pubkey, sign_text, 'base64');
	    };
	    back = buildRequestPara(sParaTemp);
	    cb(null);
	    

		});
	},
	function(cb){

		console.log(111);
		cb(null);

	}

	],function(err){
		console.log("111",back);
		return back;

})
}

getback();
// console.log(getres);































