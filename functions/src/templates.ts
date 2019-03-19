export let activationCodeEmailTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta name="viewport" content="width=device-width"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Activate your Ikonfete Account</title>
    <style type="text/css">
      body{
        margin: 0 auto;
        padding: 0;
        min-width: 100%;
        font-family: sans-serif;
      }
      table{
        margin: 50px 0 50px 0;
      }
      .header{
        height: 40px;
        text-align: center;
        text-transform: uppercase;
        font-size: 24px;
        font-weight: bold;
      }
      .content{
        height: 100px;
        font-size: 18px;
        line-height: 30px;
      }
      .subscribe{
        height: 70px;
        text-align: center;
      }
      .button{
        text-align: center;
        font-size: 18px;
        font-family: sans-serif;
        font-weight: bold;
        padding: 0 30px 0 30px;
      }
      .button a{
        color: #FFFFFF;
        text-decoration: none;
      }
      .buttonwrapper{
        margin: 0 auto;
      }
      .footer{
        text-transform: uppercase;
        text-align: center;
        height: 40px;
        font-size: 14px;
        font-style: italic;
      }
      .footer a{
        color: #000000;
        text-decoration: none;
        font-style: normal;
      }
    </style>
  </head>
  <body style="background-color: #FFFFFF">
    <table style="background-color: #FFFFFF; border: 0; width: 100%" cellspacing="0" cellpadding="0">      
      <tr class="content">
        <td style="padding:10px;">
          <p>
            Hi <b>{{name}}</b>, <br/>
            Welcome to Ikonfete. <br/>
            Use the code below to activate your account.<br/>            
          </p>
          <p style="text-align:start; font-size: 40px; letter-spacing: 5">
            <strong>{{code}}</strong>
          </p>
        </td>
      </tr>    
      <tr class="footer">
        <!-- <td style="padding: 40px;">
          <a href="http://ikonfete.com" target="_blank">Ikonfete</a>
        </td> -->
      </tr>
    </table>
  </body>
</html>
`;