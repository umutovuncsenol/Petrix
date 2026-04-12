package com.group20.vetclinic.model;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class MembershipPlan {
    private int planId;
    private String name;
    private BigDecimal monthlyFee;
    private String perksDescription;
}
