package com.group20.vetclinic.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class Invoice {
    private int invoiceId;
    private int visitId;
    private LocalDateTime createdAt;
    private BigDecimal consultationFee;
    private BigDecimal treatmentCosts;
    private BigDecimal medicationCosts;
    private String status;
    private String paymentMethod;
}
