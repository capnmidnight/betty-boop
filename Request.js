function Request()
{
	if(window.XMLHttpRequest)
	{
		var request = new XMLHttpRequest();
	}
	else if(window.ActiveXObject)
	{
		var request = new ActiveXObject("MSXML2.XMLHTTP.3.0");
	}
	else
	{
		alert("durrh!");
	}

	this.getJSON = function(page, varHash)
	{
		if(varHash !== undefined && varHash !== null)
		{
			var first = true;
			for(var elem in varHash)
			{
				if(first)
				{
					page += "?";
					first = false;
				}
				else
				{
					page += "&";
				}
				page += elem + "=" + varHash(elem);
			}
		}
		request.open("GET", page, false);
		request.send();
		var res = request.responseText;
		var text = res.substring(res.indexOf(">") + 1);
		var out = "";
		try
		{
			out = eval("("+text+")");
		}
		catch(exp)
		{
			out = "An error occured: "+exp.message+"\nResponse from Server: "+res;
		}
		return out;
	}
}