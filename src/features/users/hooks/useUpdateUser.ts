import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "../services/userService";
import type { UpdateUserDto } from "../types/users.types";

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) =>
            usersService.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};
