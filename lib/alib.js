var crypto = require('crypto');
var fs = require('fs');
var iconv = require('iconv-lite');
//引入配置信息
var AlipayConfig = require('../alipay_config.json').alipay_cfg;


exports.getPath = function (path, sPara){
    for (var i3 = 0; i3 < sPara.length; i3++) {
            var obj = sPara[i3];
            var name = obj[0];
            var value = encodeURIComponent(obj[1]);
            if(i3<(sPara.length-1)){
                path=path+name+"="+value+"&";
            }else{
                path=path+name+"="+value;
            }
    }

    return path.toString();

}
//==============================================================================
//==============================================================================
//线上环境  
/*
 * 生成要请求给支付宝的参数数组
 * @param sParaTemp 请求前的参数数组
 * @return 要请求的参数数组
 */
exports.buildRequestPara = function (sParaTemp) {
    var sPara = [];
    sPara = getsParaFromArr(sParaTemp);
    var mysign = getMD5Sign(sPara);
    //签名结果与签名方式加入请求提交参数组中
    sPara.push(["sign", mysign]);
    sPara.push(["sign_type", AlipayConfig.sign_type]);
    return sPara;
}

function getMD5Sign (sPara){
	//生成签名结果
    var prestr = "";
    prestr = getStringFromsPara(sPara);
    prestr = prestr + AlipayConfig.key; //把拼接后的字符串再与安全校验码直接连接起来
    return crypto.createHash('md5').update(prestr, AlipayConfig.input_charset).digest("hex");    
}

//从数组里面直接剔除 sign sign_type
function getsParaFromArr(sParaTemp){
	var sPara = [];
    //除去数组中的空值和签名参数
    for (var i1 = 0; i1 < sParaTemp.length; i1++) {
        var value = sParaTemp[i1];
        if (value[1] == null || value[1] == "" || value[0] == "sign"
            || value[0] == "sign_type") {
            continue;
        }
        sPara.push(value);
    }
    sPara.sort();
    return sPara;
}

//将sPara拼接成字符串 
function getStringFromsPara(sPara){
	//生成签名结果
    var prestr = "";
    //把数组所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
    for (var i2 = 0; i2 < sPara.length; i2++) {
        var obj = sPara[i2];
        if (i2 == sPara.length - 1) {
            prestr = prestr + obj[0] + "=" + obj[1];
        } else {
            prestr = prestr + obj[0] + "=" + obj[1] + "&";
        }

    }
    return prestr;
}


//验签 从json里面转变成数组 并剔除 sign  sign_type
function getsParaFromJson(params){
    console.log("params", params);
    var sPara=[];//转换为数组利于排序 除去空值和签名参数
    if(!params) return null;
    for(var key in params) {
        if((!params[key])|| key == "sign" || key == "sign_type"){
            console.log('null:'+key);
            continue;
        };
        sPara.push([key,params[key]]);
    }
    sPara.sort();
    return sPara;
}
exports.getSortString = function (params){
    console.log("params", params);
    var sPara=[];//转换为数组利于排序 除去空值和签名参数
    sPara = getsParaFromJson(params);
    return getStringFromsPara(sPara);
}

//获取验证码
//json 
exports.getMySign = function (params) {
    var sPara = getsParaFromJson(params);
    return getMD5Sign(sPara);
};


exports.checkMD5 = function(trade, sign){
    var prestr = '';
    prestr = this.getSortString(trade);
    prestr = prestr + AlipayConfig.key; //把拼接后的字符串再与安全校验码直接连接起来
    var mysign = crypto.createHash('md5').update(prestr, AlipayConfig.input_charset).digest("hex");
    //签名结果与签名方式加入请求提交参数组中
    console.log("check",mysign, sign);
    if(mysign == sign){
        console.log("验签成功");
        return true;
    } else {
        console.log("验签失败");
        return false;
    }
}



//==============================================================================
//==============================================================================
//线下环境
exports.buildRequestPara2 = function (sParaTemp) {
    var sPara = [];
    sPara = getsParaFromArr1(sParaTemp);
    var sig = getRSASign(sPara);
    sPara.push(["sign", sig]);
    return sPara;
}

function getsParaFromArr1(sParaTemp){
    var sPara = [];
	//除去数组中的空值和签名参数
    for (var i1 = 0; i1 < sParaTemp.length; i1++) {
        var value = sParaTemp[i1];
        if (value[1] == null || value[1] == "" || value[0] == "sign") {
            continue;
        }
        sPara.push(value);
    }

    sPara = sPara.sort();
    return sPara;
}

function getRSASign(sPara){
	//生成签名结果
    var prestr = getStringFromsPara(sPara);
    
    console.log("待签名字符串", prestr);
        
    var privatePem = fs.readFileSync(__dirname + '/rsa_private_key.pem');
    var key = privatePem.toString();
    var sign = crypto.createSign('RSA-SHA1');
    //var str = iconv.encode(prestr,'utf-8');
    sign.update(prestr,"utf-8");
    return sign.sign(key, 'base64');
}

//验签  取response内容  然后RSA验签
exports.checkRSA = function (response, sign){

    var prestr = JSON.stringify(response);
    decode_prestr = prestr.replace(/\//g,"\\/");
    var publicPem = fs.readFileSync(__dirname + '/rsa_public_key.pem');
    var pubkey = publicPem.toString();
    var sign_text = sign;
    var check = crypto.createVerify('RSA-SHA1');
    check.update(iconv.encode(decode_prestr,'UTF-8'));
    var result = check.verify(pubkey, sign_text, 'base64');
    console.log("验签结果", result);

    return result

}


