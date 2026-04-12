package com.group20.vetclinic.model;

import lombok.Data;
import java.time.LocalDate;

@Data
public class Pet {
    private int petId;
    private int ownerId;
    private String name;
    private String species;
    private String breed;
    private LocalDate birthDate;
}
