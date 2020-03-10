package com.hobook.tomo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class PageController {
    @RequestMapping(value = "/login", method = RequestMethod.GET)
    public String goLogin()
    {
        return "login";
    }

    @RequestMapping(value = "/memo", method = RequestMethod.GET)
    public String goMemo()
    {
        return "memo";
    }

    @RequestMapping(value = "/", method = RequestMethod.GET)
    public String goHome()
    {
        return "memo";
    }

    @RequestMapping(value = "/manage", method = RequestMethod.GET)
    public String goManage()
    {
        return "manage";
    }
}
